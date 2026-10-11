import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { categoriesApi } from '../api/categories';
import { accountsApi } from '../api/accounts';
import { useAuth } from './AuthContext';
import { useDataRefresh } from './DataRefreshContext';

const LookupContext = createContext({
  categories: [],
  accounts: [],
  loadingLookups: false,
  refreshCategories: () => Promise.resolve(),
  refreshAccounts: () => Promise.resolve(),
  refreshLookups: () => Promise.resolve(),
});

export function LookupProvider({ children }) {
  const { user } = useAuth();
  const { version } = useDataRefresh();
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const fetchCategories = useCallback(async () => {
    if (!user) return [];
    try {
      const data = await categoriesApi.list();
      setCategories(data);
      return data;
    } catch {
      return [];
    }
  }, [user]);

  const fetchAccounts = useCallback(async () => {
    if (!user) return [];
    try {
      const data = await accountsApi.list();
      setAccounts(data);
      return data;
    } catch {
      return [];
    }
  }, [user]);

  const refreshLookups = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setAccounts([]);
      return;
    }
    setLoadingLookups(true);
    try {
      await Promise.all([fetchCategories(), fetchAccounts()]);
    } finally {
      setLoadingLookups(false);
    }
  }, [user, fetchCategories, fetchAccounts]);

  useEffect(() => {
    if (user) {
      refreshLookups();
    } else {
      setCategories([]);
      setAccounts([]);
    }
  }, [user, version, refreshLookups]);

  return (
    <LookupContext.Provider
      value={{
        categories,
        accounts,
        loadingLookups,
        refreshCategories: fetchCategories,
        refreshAccounts: fetchAccounts,
        refreshLookups,
      }}
    >
      {children}
    </LookupContext.Provider>
  );
}

export function useLookups() {
  return useContext(LookupContext);
}
