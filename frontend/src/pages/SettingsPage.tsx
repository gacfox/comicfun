import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore, useLanguageStore } from "@/stores";
import { useTheme } from "next-themes";
import {
  createAPIKey,
  listAPIKeys,
  revokeAPIKey,
  type APIKeyData,
} from "@/services/apikey";

const languages = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en-US", label: "English" },
];

const themes = [
  { value: "system", labelKey: "theme.system" },
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
];

function APIKeyCard() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<APIKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [revokingKey, setRevokingKey] = useState<APIKeyData | null>(null);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    const res = await listAPIKeys();
    if (res.code === 0 && res.data) {
      setKeys(res.data);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    const res = await createAPIKey(name.trim());
    setSubmitting(false);
    if (res.code === 0 && res.data) {
      setCreateDialogOpen(false);
      setName("");
      setNewToken(res.data.token);
      setTokenDialogOpen(true);
      loadKeys();
    }
  };

  const handleRevoke = async () => {
    if (!revokingKey) return;
    setSubmitting(true);
    const res = await revokeAPIKey(revokingKey.id);
    setSubmitting(false);
    if (res.code === 0) {
      setRevokeDialogOpen(false);
      setRevokingKey(null);
      loadKeys();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {t("settings.apikey.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.apikey.description")}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("settings.apikey.create")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            {t("common.noData")}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.apikey.name")}</TableHead>
                  <TableHead>{t("settings.apikey.createTime")}</TableHead>
                  <TableHead>{t("settings.apikey.lastUsedTime")}</TableHead>
                  <TableHead className="w-24 text-center">
                    {t("settings.apikey.status")}
                  </TableHead>
                  <TableHead className="w-20 text-center">
                    {t("common.operation")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>{key.create_time}</TableCell>
                    <TableCell>
                      {key.last_used_time || t("settings.apikey.never")}
                    </TableCell>
                    <TableCell className="text-center">
                      {key.revoked === 1 ? (
                        <Badge variant="outline">
                          {t("settings.apikey.revoked")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t("settings.apikey.active")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {key.revoked !== 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRevokingKey(key);
                            setRevokeDialogOpen(true);
                          }}
                          title={t("settings.apikey.revoke")}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t("settings.apikey.create")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="apikey-name">
                  {t("settings.apikey.name")}
                </Label>
                <Input
                  id="apikey-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("settings.apikey.namePlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={submitting || !name.trim()}
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("settings.apikey.revokeTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("settings.apikey.revokeConfirm", {
                  name: revokingKey?.name,
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                disabled={submitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t("settings.apikey.revoke")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>{t("settings.apikey.createdTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                {t("settings.apikey.createdMessage")}
              </p>
              <div className="flex items-center gap-2">
                <Input value={newToken} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setTokenDialogOpen(false)}>
                {t("common.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    i18n.changeLanguage(value);
  };

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{t("settings.title")}</h1>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                {t("settings.theme.title")}
              </CardTitle>
              <CardDescription>
                {t("settings.theme.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-48">
                  <SelectValue
                    placeholder={t(
                      theme === "dark"
                        ? "theme.dark"
                        : theme === "light"
                          ? "theme.light"
                          : "theme.system",
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((themeItem) => (
                    <SelectItem key={themeItem.value} value={themeItem.value}>
                      {t(themeItem.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t("settings.language.title")}
              </CardTitle>
              <CardDescription>
                {t("settings.language.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {user?.isAdmin === 1 && <APIKeyCard />}
        </div>
      </div>
    </Layout>
  );
}
