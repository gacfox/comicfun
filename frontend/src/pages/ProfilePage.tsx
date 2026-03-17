import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { User, Lock, Loader2, Upload, X } from "lucide-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores";
import { updateProfile, updatePassword } from "@/services/user";
import { uploadAvatar } from "@/services/upload";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    displayUsername: user?.displayUsername || "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [profileMessage, setProfileMessage] = useState({
    type: "",
    text: "",
  });
  const [passwordMessage, setPasswordMessage] = useState({
    type: "",
    text: "",
  });

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadAvatar(file);
    setUploading(false);

    if (res.code === 0 && res.data) {
      setProfileForm({ ...profileForm, avatarUrl: res.data.url });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setProfileForm({ ...profileForm, avatarUrl: "" });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage({ type: "", text: "" });
    setProfileLoading(true);

    const res = await updateProfile({
      displayUsername: profileForm.displayUsername.trim(),
      avatarUrl: profileForm.avatarUrl.trim(),
    });

    setProfileLoading(false);

    if (res.code === 0 && res.data) {
      updateUser(res.data);
      setProfileMessage({ type: "success", text: t("profile.updateSuccess") });
    } else {
      setProfileMessage({
        type: "error",
        text: res.message || t("common.error"),
      });
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: t("profile.passwordMismatch"),
      });
      return;
    }

    setPasswordLoading(true);

    const res = await updatePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });

    setPasswordLoading(false);

    if (res.code === 0) {
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordMessage({
        type: "success",
        text: t("profile.passwordUpdateSuccess"),
      });
    } else {
      setPasswordMessage({
        type: "error",
        text: res.message || t("common.error"),
      });
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">{t("profile.title")}</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t("profile.profileTab")}
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t("profile.passwordTab")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.profileInfo")}</CardTitle>
                <CardDescription>
                  {t("profile.profileDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("auth.username")}</Label>
                    <Input
                      id="username"
                      value={user?.username || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayUsername">
                      {t("profile.displayUsername")}
                    </Label>
                    <Input
                      id="displayUsername"
                      value={profileForm.displayUsername}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          displayUsername: e.target.value,
                        })
                      }
                      placeholder={t("profile.displayUsernamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.avatar")}</Label>
                    <div className="flex items-center gap-4">
                      <Avatar
                        className={`h-16 w-16 ${profileForm.avatarUrl ? "cursor-pointer" : ""}`}
                        onClick={() =>
                          profileForm.avatarUrl && setPreviewOpen(true)
                        }
                      >
                        <AvatarImage src={profileForm.avatarUrl} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {profileForm.displayUsername
                            ? getInitials(profileForm.displayUsername)
                            : user?.username
                              ? getInitials(user.username)
                              : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {t("profile.uploadAvatar")}
                        </Button>
                        {profileForm.avatarUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveAvatar}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t("common.delete")}
                          </Button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </div>
                  {profileMessage.text && (
                    <p
                      className={
                        profileMessage.type === "error"
                          ? "text-sm text-destructive"
                          : "text-sm text-green-600"
                      }
                    >
                      {profileMessage.text}
                    </p>
                  )}
                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("common.save")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.changePassword")}</CardTitle>
                <CardDescription>
                  {t("profile.changePasswordDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">
                      {t("profile.oldPassword")}
                    </Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          oldPassword: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      {t("profile.newPassword")}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      {t("profile.confirmPassword")}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  {passwordMessage.text && (
                    <p
                      className={
                        passwordMessage.type === "error"
                          ? "text-sm text-destructive"
                          : "text-sm text-green-600"
                      }
                    >
                      {passwordMessage.text}
                    </p>
                  )}
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("profile.updatePassword")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{t("profile.avatarPreview")}</DialogTitle>
          <img
            src={profileForm.avatarUrl}
            alt="avatar"
            className="w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
