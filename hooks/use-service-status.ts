import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/auth-context';
import { isDemoUser } from '../services/api/demo';
import { checkServiceStatus, ServiceStatus } from '../services/api/health';

const INTERVAL_MS = 30_000;

export function useServiceStatus(): ServiceStatus {
  const user = useContext(AuthContext)?.state.user;
  const hacUrl = user?.hacUrl;
  const demo = user ? isDemoUser(user.username) : false;
  const [status, setStatus] = useState<ServiceStatus>('ok');

  useEffect(() => {
    if (demo) {
      setStatus('ok');
      return;
    }

    let active = true;
    const probe = () => {
      checkServiceStatus(hacUrl).then((next) => {
        if (active) setStatus(next);
      });
    };

    probe();
    const timer = setInterval(probe, INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [demo, hacUrl]);

  return status;
}
