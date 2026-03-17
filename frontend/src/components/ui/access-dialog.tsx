import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getArtifactACL,
  getRegularUsers,
  updateArtifactACL,
  type User,
} from "@/services/acl";
import { Loader2 } from "lucide-react";

interface AccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifactId: string;
  title: string;
}

export function AccessDialog({
  open,
  onOpenChange,
  artifactId,
  title,
}: AccessDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aclData, usersData] = await Promise.all([
        getArtifactACL(artifactId),
        getRegularUsers(),
      ]);
      if (aclData.code === 0) {
        const authorizedIds = aclData.data?.users.map((u) => u.id) || [];
        setSelectedUserIds(authorizedIds);
      }
      if (usersData.code === 0) {
        setUsers(usersData.data?.users || []);
      }
    } catch (error) {
      console.error("Failed to load authorization data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, artifactId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateArtifactACL(artifactId, selectedUserIds);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update authorization:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const getDisplayName = (user: User) => {
    return user.displayUsername || user.username || "未知用户";
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("acl.description")}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-100 overflow-y-auto py-2">
            {users.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("acl.noUsers")}
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => {
                  const displayName = getDisplayName(user);
                  const initials = getInitials(displayName);
                  const isSelected = selectedUserIds.includes(user.id);

                  return (
                    <div
                      key={user.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                        ${isSelected ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-muted/50"}
                      `}
                      onClick={() => toggleUser(user.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {displayName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{user.username}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("acl.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("acl.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
