"use client";

import { useEffect, useState } from "react";

export default function useAsyncList<T>(
  load: () => Promise<T[]>,
  errorContext: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    load()
      .then((loadedItems) => {
        if (isMounted) {
          setItems(loadedItems);
        }
      })
      .catch((error: unknown) => {
        console.error(errorContext, error);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [errorContext, load]);

  return { items, loading };
}
