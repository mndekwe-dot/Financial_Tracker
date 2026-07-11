"""MTN Mobile Money SMS parser.

Turns a raw MoMo notification SMS into a structured record: direction (money in
vs out), amount, the other party, a transaction id (used for de-duplication) and
the date. MTN's wording varies by country, so extraction is phrase-anchored with
keyword/first-amount fallbacks rather than one rigid regex.

If you hit a message that isn't parsed correctly, add/adjust a rule in
AMOUNT_RULES or PARTY_RULES below and cover it with a sample in tests.
"""
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

# Currency codes/symbols seen across MTN MoMo markets.
CURRENCY = r'(?:RWF|FRW|UGX|GHS|GH₵|NGN|XAF|XOF|FCFA|ZMW|SSP|USD|EUR)'
# A money amount, optionally followed (or preceded) by a currency token.
_NUM = r'\d[\d,\s]*(?:\.\d+)?'
AMOUNT = rf'(?P<amt>{_NUM})\s*{CURRENCY}?'

# Ordered (regex, direction, kind). First match wins for the transaction amount.
AMOUNT_RULES = [
    (rf'received\s+{AMOUNT}', 'in', 'received'),
    (rf'deposit(?:ed)?\s+(?:of\s+)?{AMOUNT}', 'in', 'deposit'),
    # airtime is checked before generic payment/purchase so it categorises correctly
    (rf'airtime\D{{0,25}}?{AMOUNT}', 'out', 'airtime'),
    (rf'payment\s+of\s+{AMOUNT}', 'out', 'payment'),
    (rf'purchase\s+of\s+{AMOUNT}', 'out', 'payment'),
    (rf'{AMOUNT}\s+transferred', 'out', 'sent'),
    (rf'transferred\s+{AMOUNT}', 'out', 'sent'),
    (rf'(?:you have\s+)?sent\s+{AMOUNT}', 'out', 'sent'),
    (rf'withdraw(?:n|al)?\s+(?:of\s+)?{AMOUNT}', 'out', 'withdrawal'),
    (rf'paid\s+{AMOUNT}', 'out', 'payment'),
]

# Keyword hints used only when no AMOUNT_RULE matched, to still guess direction.
IN_HINTS = ('received', 'credited', 'deposit')
OUT_HINTS = ('payment', 'transferred', 'sent', 'withdraw', 'airtime', 'purchase', 'paid', 'debited')

TXID_RE = re.compile(
    r'(?:Financial\s+Transaction\s+Id|Transaction\s+Id|TxId|Txn\s*Id|Ref(?:erence)?(?:\s*No)?)'
    r'\s*[:.#]?\s*([A-Za-z0-9]+)',
    re.I,
)

# "from John Doe (2507...)" / "to SHOP NAME (12345)" / "to John Doe"
PARTY_FROM_RE = re.compile(r'\bfrom\s+([A-Za-z0-9][\w .&\'-]{1,60}?)(?:\s*\(|\.|,|\s+on\b|\s+at\b|$)', re.I)
PARTY_TO_RE = re.compile(r'\bto\s+([A-Za-z0-9][\w .&\'-]{1,60}?)(?:\s*\(|\.|,|\s+has\b|\s+on\b|\s+at\b|$)', re.I)

DATE_RES = [
    re.compile(r'(\d{4})-(\d{2})-(\d{2})'),                       # 2024-01-15
    re.compile(r'(\d{1,2})/(\d{1,2})/(\d{2,4})'),                 # 15/01/2024
    re.compile(r'(\d{1,2})-(\d{1,2})-(\d{2,4})'),                 # 15-01-2024
]


@dataclass
class ParsedMomo:
    direction: str          # 'in' | 'out'
    kind: str               # received | sent | payment | airtime | withdrawal | deposit
    amount: Decimal
    party: str
    txid: str
    occurred_on: date

    @property
    def transaction_type(self):
        return 'income' if self.direction == 'in' else 'expense'


def _to_decimal(raw):
    try:
        cleaned = re.sub(r'[,\s]', '', raw)
        value = Decimal(cleaned)
        return value if value > 0 else None
    except (InvalidOperation, AttributeError):
        return None


def _extract_amount_and_direction(text):
    for pattern, direction, kind in AMOUNT_RULES:
        m = re.search(pattern, text, re.I)
        if m:
            amount = _to_decimal(m.group('amt'))
            if amount is not None:
                return amount, direction, kind

    # Fallback: guess direction from keywords, take the first money amount that
    # isn't the running balance or a fee.
    lower = text.lower()
    direction = None
    if any(h in lower for h in IN_HINTS):
        direction = 'in'
    elif any(h in lower for h in OUT_HINTS):
        direction = 'out'
    if direction is None:
        return None, None, None

    for m in re.finditer(rf'(?P<amt>{_NUM})\s*{CURRENCY}', text, re.I):
        preceding = text[max(0, m.start() - 12):m.start()].lower()
        if 'balance' in preceding or 'fee' in preceding:
            continue
        amount = _to_decimal(m.group('amt'))
        if amount is not None:
            return amount, direction, 'other'
    return None, None, None


def _extract_party(text, direction):
    rex = PARTY_FROM_RE if direction == 'in' else PARTY_TO_RE
    m = rex.search(text)
    if m:
        return re.sub(r'\s+', ' ', m.group(1)).strip(' .,')
    return ''


def _extract_date(text):
    for rex in DATE_RES:
        m = rex.search(text)
        if not m:
            continue
        try:
            a, b, c = m.groups()
            if len(a) == 4:                      # yyyy-mm-dd
                return date(int(a), int(b), int(c))
            year = int(c) + 2000 if len(c) == 2 else int(c)   # dd/mm/yyyy
            return date(year, int(b), int(a))
        except (ValueError, TypeError):
            continue
    return date.today()


def looks_like_momo(text):
    """Cheap gate so unrelated SMS forwarded by mistake are ignored."""
    if not text:
        return False
    lower = text.lower()
    has_money_word = any(w in lower for w in (
        'mobile money', 'momo', 'received', 'payment', 'transferred', 'withdraw', 'airtime', 'balance', 'txid'
    ))
    has_currency = re.search(CURRENCY, text, re.I) is not None
    return has_money_word and has_currency


def parse_momo_sms(text):
    """Return a ParsedMomo, or None if the message can't be understood."""
    if not text or not looks_like_momo(text):
        return None
    amount, direction, kind = _extract_amount_and_direction(text)
    if amount is None or direction is None:
        return None
    txid_match = TXID_RE.search(text)
    return ParsedMomo(
        direction=direction,
        kind=kind or 'other',
        amount=amount,
        party=_extract_party(text, direction),
        txid=txid_match.group(1) if txid_match else '',
        occurred_on=_extract_date(text),
    )
