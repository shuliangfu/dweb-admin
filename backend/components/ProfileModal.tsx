/**
 * "Update profile" Modal (opened from the avatar dropdown). Edits the logged-in user's own
 * display name / email via PUT /api/account/profile (server validates; target = session user).
 * The user model has no avatar field, so there is none here.
 */
import { createEffect, createSignal } from "@dreamer/view";
import { Button, FormItem, Input, Modal } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { api, toastResult } from "@backend/components/crud-kit.tsx";

export const profileOpen = createSignal(false);

const username = createSignal("");
const roles = createSignal("");
const nickname = createSignal("");
const email = createSignal("");
const errors = createSignal<string[]>([]);
const busy = createSignal(false);
const val = (e: Event) => (e.target as unknown as { value: string }).value;

export function ProfileModal(props: { locale: Locale }) {
  const tr = createT(props.locale);
  const net = tr("crud.networkError");

  createEffect(() => {
    if (!profileOpen.value) return;
    errors.value = [];
    void api<{ username: string; nickname: string; email: string; roleCodes: string[] }>("GET", "/api/account/profile")
      .then((r) => {
        if (!r.ok) return;
        username.value = r.data.username;
        roles.value = (r.data.roleCodes ?? []).join(", ");
        nickname.value = r.data.nickname;
        email.value = r.data.email ?? "";
      });
  });

  async function save() {
    if (busy.value) return;
    busy.value = true;
    const r = await api("POST", "/api/account/profile/updateProfile", { nickname: nickname.value, email: email.value });
    busy.value = false;
    errors.value = r.ok ? [] : (r.data.fields ?? []);
    if (toastResult(r, tr("profile.saved"), net)) {
      profileOpen.value = false;
      // Header / sidebar are server-rendered from the session user: refresh them.
      setTimeout(() => (globalThis as unknown as { location: { reload: () => void } }).location.reload(), 500);
    }
  }

  const err = (f: string) => (errors.value.includes(f) ? tr("apiError.invalid") : undefined);

  return (
    <Modal
      open={profileOpen}
      title={tr("profile.title")}
      width="md"
      keyboard
      destroyOnClose
      onClose={() => {
        profileOpen.value = false;
      }}
    >
      {() => (
        <div class="grid gap-3" data-testid="profile-form">
          <FormItem label={tr("profile.username")}>
            <Input value={username} readOnly disabled />
          </FormItem>
          <FormItem label={tr("profile.role")}>
            <Input value={roles} readOnly disabled />
          </FormItem>
          <FormItem label={tr("profile.nickname")} required error={err("nickname") as never}>
            <Input
              name="nickname"
              value={nickname}
              onInput={(e: Event) => {
                nickname.value = val(e);
              }}
            />
          </FormItem>
          <FormItem label={tr("profile.email")} error={err("email") as never}>
            <Input
              name="email"
              type="email"
              value={email}
              placeholder={tr("profile.emailPlaceholder")}
              onInput={(e: Event) => {
                email.value = val(e);
              }}
            />
          </FormItem>
          <div class="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                profileOpen.value = false;
              }}
            >
              {tr("crud.cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={save}>{tr("crud.confirm")}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
