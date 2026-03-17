import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from "@/services/user";
import type { UserData } from "@/services/types";

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetConfirmDialogOpen, setResetConfirmDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [resettingUser, setResettingUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    username: "",
    displayUsername: "",
    isAdmin: false,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const res = await listUsers();
    if (res.code === 0 && res.data) {
      setUsers(res.data.items);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setForm({
      username: "",
      displayUsername: "",
      isAdmin: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      displayUsername: user.displayUsername,
      isAdmin: user.isAdmin === 1,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: UserData) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const openResetPasswordDialog = (user: UserData) => {
    setResettingUser(user);
    setResetConfirmDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingUser && !form.username.trim()) return;

    setSubmitting(true);

    if (editingUser) {
      const res = await updateUser(editingUser.id, {
        displayUsername: form.displayUsername.trim() || undefined,
        isAdmin: form.isAdmin ? 1 : 0,
      });
      setSubmitting(false);
      if (res.code === 0) {
        setDialogOpen(false);
        loadUsers();
      }
    } else {
      const res = await createUser({
        username: form.username.trim(),
        displayUsername: form.displayUsername.trim() || undefined,
        isAdmin: form.isAdmin ? 1 : 0,
      });
      setSubmitting(false);
      if (res.code === 0 && res.data) {
        setDialogOpen(false);
        setNewPassword(res.data.password);
        setPasswordDialogOpen(true);
        loadUsers();
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setSubmitting(true);
    const res = await deleteUser(deletingUser.id);
    setSubmitting(false);

    if (res.code === 0) {
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      loadUsers();
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("Failed to copy");
    }
  };

  const handleResetPassword = async () => {
    if (!resettingUser) return;

    setSubmitting(true);
    const res = await resetPassword(resettingUser.id);
    setSubmitting(false);

    if (res.code === 0 && res.data) {
      setResetConfirmDialogOpen(false);
      setNewPassword(res.data.password);
      setPasswordDialogOpen(true);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 px-4 pb-6 pt-4 md:px-0 md:pb-0 md:pt-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{t("users.title")}</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("users.create")}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {t("common.noData")}
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>{t("users.username")}</TableHead>
                  <TableHead>{t("users.displayUsername")}</TableHead>
                  <TableHead className="w-28 text-center">
                    {t("users.role")}
                  </TableHead>
                  <TableHead className="w-40 text-center">
                    {t("common.edit")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell className="font-medium">
                      {user.username}
                    </TableCell>
                    <TableCell>{user.displayUsername || "-"}</TableCell>
                    <TableCell className="text-center">
                      {user.isAdmin === 1 ? (
                        <Badge variant="secondary">{t("users.admin")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("users.normalUser")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openResetPasswordDialog(user)}
                        title={t("users.resetPassword")}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("users.edit") : t("users.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("users.username")}</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={t("users.usernamePlaceholder")}
                disabled={!!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayUsername">
                {t("users.displayUsername")}
              </Label>
              <Input
                id="displayUsername"
                value={form.displayUsername}
                onChange={(e) =>
                  setForm({ ...form, displayUsername: e.target.value })
                }
                placeholder={t("users.displayUsernamePlaceholder")}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isAdmin"
                checked={form.isAdmin}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isAdmin: checked })
                }
              />
              <Label htmlFor="isAdmin">{t("users.isAdmin")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || (!editingUser && !form.username.trim())}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.deleteConfirm", { name: deletingUser?.username })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resetConfirmDialogOpen}
        onOpenChange={setResetConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.resetPasswordTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("users.resetPasswordConfirm", {
                name: resettingUser?.username,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("users.passwordInfo")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {resettingUser
                ? t("users.passwordResetMessage")
                : t("users.passwordCreatedMessage")}
            </p>
            <div className="flex items-center gap-2">
              <Input value={newPassword} readOnly className="font-mono" />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPassword}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPasswordDialogOpen(false)}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
