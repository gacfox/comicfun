import { useEffect } from "react";
import { InitPage } from "@/pages/InitPage";
import { checkSystemInitialized } from "@/services/system";
import { useSystemStore } from "@/stores";
import { RoutesView } from "@/Routes";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

function App() {
  const { isInitialized, setInitialized } = useSystemStore();

  useEffect(() => {
    if (isInitialized === null) {
      checkSystemInitialized()
        .then((response) => {
          setInitialized(
            response.code === 0 && response.data
              ? response.data.initialized
              : false,
          );
        })
        .catch(() => setInitialized(false));
    }
  }, [isInitialized, setInitialized]);

  if (isInitialized === null) {
    return null;
  }

  return (
    <ThemeProvider storageKey="theme-storage">
      {!isInitialized ? (
        <InitPage />
      ) : (
        <BrowserRouter>
          <RoutesView />
          <Toaster />
        </BrowserRouter>
      )}
    </ThemeProvider>
  );
}

export default App;
