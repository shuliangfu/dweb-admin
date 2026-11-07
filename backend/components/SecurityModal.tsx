/**
 * Security settings Modal (opened from the avatar dropdown).
 *  - Change password (old password verified server side)
 *  - Fingerprint login (WebAuthn passkeys): enrol, on/off, manage credentials
 *  - Google 2FA (TOTP): QR + verify one code to enable; a valid code is required to disable
 */
import { createEffect, createSignal } from "@dreamer/view";
import { Button, FormItem, Input, Modal, Switch, Tabs, Tag, message } from "@dreamer/ui-view";
import { createT, type Locale } from "@common/i18n/mod.ts";
import { createCredentialJSON, passkeySupported } from "@common/utils/webauthn-client.ts";
import { api, ConfirmDelete, toastResult } from "@backend/components/crud-kit.tsx";

export const securityOpen = createSignal(false);

interface Overview {
  totpEnabled: boolean;
  passkeyEnabled: boolean;
  passkeys: { id: string; name: string; createdAt: string; lastUsedAt: string }[];
}

const tab = createSignal("password");
const overview = createSignal<Overview | null>(null);
// password
const oldPw = createSignal("");
const newPw = createSignal("");
const newPw2 = createSignal("");
const pwErrors = createSignal<string[]>([]);
// passkey
const pkName = createSignal("");
const pkEnabled = createSignal(false);
const removing = createSignal("");
// totp
const setup = createSignal<{ secret: string; qrCode: string } | null>(null);
const code = createSignal("");
const codeError = createSignal(false);
const busy = createSignal(false);

const numeric = { maxLength: 6, inputMode: "numeric" } as Record<string, unknown>;
const val = (e: Event) => (e.target as unknown as { value: string }).value;

export function SecurityModal(props: { locale: Locale }) {
  const tr = createT(props.locale);
  const net = tr("crud.networkError");

  async function refresh() {
    const r = await api<Overview>("GET", "/api/account/security");
    if (r.ok) {
      overview.value = r.data as unknown as Overview;
      pkEnabled.value = overview.value.passkeyEnabled;
    }
  }

  // Load fresh state every time the modal opens.
  createEffect(() => {
    if (securityOpen.value) {
      tab.value = "password";
      oldPw.value = newPw.value = newPw2.value = code.value = pkName.value = "";
      pwErrors.value = [];
      codeError.value = false;
      setup.value = null;
      void refresh();
    }
  });

  async function savePassword() {
    if (busy.value) return;
    if (newPw.value !== newPw2.value) {
      pwErrors.value = ["newPassword2"];
      toastResult({ ok: false, status: 400, data: { message: tr("security.mismatch") } }, "", net);
      return;
    }
    busy.value = true;
    const r = await api("POST", "/api/account/password", { oldPassword: oldPw.value, newPassword: newPw.value });
    busy.value = false;
    pwErrors.value = r.ok ? [] : (r.data.fields ?? []);
    if (toastResult(r, tr("security.passwordChanged"), net)) {
      oldPw.value = newPw.value = newPw2.value = "";
    }
  }

  async function enrollPasskey() {
    if (!passkeySupported()) {
      toastResult({ ok: false, status: 400, data: { message: tr("security.passkeyUnsupported") } }, "", net);
      return;
    }
    busy.value = true;
    try {
      const o = await api<{ options: unknown }>("POST", "/api/account/passkeys/options");
      if (!o.ok) throw new Error("options");
      const response = await createCredentialJSON(o.data.options);
      const r = await api("POST", "/api/account/passkeys/register", { response, name: pkName.value });
      if (toastResult(r, tr("security.passkeySaved"), net)) {
        pkName.value = "";
        await refresh();
      }
    } catch {
      toastResult({ ok: false, status: 400, data: { message: tr("apiError.passkeyFailed") } }, "", net);
    }
    busy.value = false;
  }

  async function togglePasskey(enabled: boolean) {
    const r = await api("POST", "/api/account/passkeys/toggle", { enabled });
    toastResult(r, tr("crud.saved"), net);
    await refresh();
  }

  async function startTotp() {
    busy.value = true;
    const r = await api<{ secret: string; qrCode: string }>("POST", "/api/account/totp/setup");
    busy.value = false;
    if (r.ok) {
      setup.value = { secret: r.data.secret, qrCode: r.data.qrCode };
      code.value = "";
      codeError.value = false;
    } else toastResult(r, "", net);
  }

  async function enableTotp() {
    busy.value = true;
    const r = await api("POST", "/api/account/totp/enable", { code: code.value });
    busy.value = false;
    codeError.value = !r.ok;
    if (toastResult(r, tr("security.totpEnabledOk"), net)) {
      setup.value = null;
      code.value = "";
      await refresh();
    }
  }

  async function disableTotp() {
    busy.value = true;
    const r = await api("POST", "/api/account/totp/disable", { code: code.value });
    busy.value = false;
    codeError.value = !r.ok;
    if (toastResult(r, tr("security.totpDisabledOk"), net)) {
      code.value = "";
      await refresh();
    }
  }

  const pwField = (label: string, sig: ReturnType<typeof createSignal<string>>, name: string, field: string) => (
    <FormItem label={label} required error={pwErrors.value.includes(field) ? tr("crud.required") : undefined}>
      <Input
        type="password"
        name={name}
        value={sig}
        autoComplete={name === "oldPassword" ? "current-password" : "new-password"}
        onInput={(e: Event) => {
          sig.value = val(e);
        }}
      />
    </FormItem>
  );

  const passwordPanel = () => (
    <div class="grid gap-3" data-testid="sec-password">
      {pwField(tr("security.oldPassword"), oldPw, "oldPassword", "oldPassword")}
      {pwField(tr("security.newPassword"), newPw, "newPassword", "newPassword")}
      {pwField(tr("security.confirmPassword"), newPw2, "newPassword2", "newPassword2")}
      <div class="flex justify-end">
        <Button type="button" variant="primary" onClick={savePassword}>{tr("crud.confirm")}</Button>
      </div>
    </div>
  );

  const passkeyPanel = () => (
    <div class="grid gap-4" data-testid="sec-passkey">
      <p class="m-0 text-sm opacity-80">{tr("security.passkeyIntro")}</p>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">{tr("security.passkeyEnabled")}</span>
        <Switch
          checked={pkEnabled}
          onChange={(e: Event) => void togglePasskey((e.target as unknown as { checked: boolean }).checked)}
        />
      </div>
      <FormItem
        label={tr("security.passkeyName")}
        class="!my-0"
        trailing={
          <Button type="button" variant="primary" data-testid="passkey-enroll" onClick={enrollPasskey}>
            {tr("security.passkeyEnroll")}
          </Button>
        }
      >
        <Input
          value={pkName}
          placeholder="MacBook Touch ID"
          onInput={(e: Event) => {
            pkName.value = val(e);
          }}
        />
      </FormItem>
      <ul class="m-0 grid list-none gap-2 p-0">
        {(overview.value?.passkeys ?? []).length === 0
          ? <li class="text-sm opacity-60">{tr("security.passkeyNone")}</li>
          : (overview.value?.passkeys ?? []).map((k) => (
            <li class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600">
              <span>
                <b>{k.name}</b>
                <span class="ml-2 text-xs opacity-60">
                  {tr("security.passkeyAdded")} {k.createdAt.slice(0, 10)} · {tr("security.passkeyLast")}{" "}
                  {k.lastUsedAt ? k.lastUsedAt.slice(0, 16).replace("T", " ") : tr("security.passkeyNever")}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => {
                  removing.value = k.id;
                }}
              >
                {tr("crud.delete")}
              </Button>
            </li>
          ))}
      </ul>
    </div>
  );

  const totpPanel = () => {
    const on = overview.value?.totpEnabled ?? false;
    const s = setup.value;
    return (
      <div class="grid gap-4" data-testid="sec-totp">
        <div class="flex items-center justify-between">
          <p class="m-0 text-sm opacity-80">{tr("security.totpIntro")}</p>
          <Tag variant={on ? "success" : "default"}>{tr(on ? "security.totpOn" : "security.totpOff")}</Tag>
        </div>
        {on
          ? (
            <div class="grid gap-3">
              <p class="m-0 text-sm">{tr("security.totpDisableAsk")}</p>
              <FormItem label={tr("security.totpCode")} error={(codeError.value ? tr("apiError.totpWrong") : undefined) as never}>
                <Input
                  value={code}
                  {...numeric}
                  autoComplete="one-time-code"
                  onInput={(e: Event) => {
                    code.value = val(e);
                  }}
                />
              </FormItem>
              <div class="flex justify-end">
                <Button type="button" variant="danger" onClick={disableTotp}>{tr("security.totpDisable")}</Button>
              </div>
            </div>
          )
          : s
          ? (
            <div class="grid gap-3">
              <p class="m-0 text-sm">{tr("security.totpScan")}</p>
              <div class="flex flex-wrap items-start gap-4">
                <img
                  src={s.qrCode}
                  alt="TOTP QR"
                  width={160}
                  height={160}
                  class="h-40 w-40 shrink-0 rounded bg-white p-1 object-contain"
                  data-testid="totp-qr"
                />
                <div class="min-w-0 flex-1">
                  <p class="m-0 mb-1 text-xs opacity-60">{tr("security.totpSecret")}</p>
                  <code class="break-all text-sm" data-testid="totp-secret">{s.secret}</code>
                  <div class="mt-2" data-testid="totp-copy-secret">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        try {
                          void navigator.clipboard.writeText(s.secret).then(() => {
                            message.success(tr("security.totpCopied"));
                          });
                        } catch {
                          /* clipboard may be denied */
                        }
                      }}
                    >
                      {tr("security.totpCopy")}
                    </Button>
                  </div>
                </div>
              </div>
              <FormItem label={tr("security.totpCode")} error={(codeError.value ? tr("apiError.totpWrong") : undefined) as never}>
                <Input
                  value={code}
                  {...numeric}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  onInput={(e: Event) => {
                    code.value = val(e);
                  }}
                />
              </FormItem>
              <div class="flex justify-end">
                <Button type="button" variant="primary" onClick={enableTotp}>{tr("security.totpVerify")}</Button>
              </div>
            </div>
          )
          : (
            <div class="flex justify-end" data-testid="totp-start">
              <Button type="button" variant="primary" onClick={startTotp}>
                {tr("security.totpStart")}
              </Button>
            </div>
          )}
      </div>
    );
  };

  return (
    <>
      <Modal
        open={securityOpen}
        title={tr("security.title")}
        width="md"
        keyboard
        destroyOnClose
        onClose={() => {
          securityOpen.value = false;
        }}
        children={() => (
          <div>
            <Tabs
              activeKey={tab.value}
              onChange={(k: string) => {
                tab.value = k;
              }}
              items={[
                { key: "password", label: <span data-testid="sec-tab-password">{tr("security.tabPassword")}</span>, children: null },
                { key: "passkey", label: <span data-testid="sec-tab-passkey">{tr("security.tabPasskey")}</span>, children: null },
                { key: "totp", label: <span data-testid="sec-tab-totp">{tr("security.tabTotp")}</span>, children: null },
              ] as never}
            />
            <div class="pt-4">
              {tab.value === "password" ? passwordPanel() : tab.value === "passkey" ? passkeyPanel() : totpPanel()}
            </div>
          </div>
        )}
      />
      <ConfirmDelete
        target={removing}
        title={tr("crud.deleteTitle")}
        ask={(id) =>
          tr("security.removeAsk", { name: overview.value?.passkeys.find((k) => k.id === id)?.name ?? "" })}
        okText={tr("crud.delete")}
        cancelText={tr("crud.cancel")}
        onConfirm={async (id) => {
          const r = await api("POST", "/api/account/passkeys/remove", { id });
          toastResult(r, tr("crud.deleted"), net);
          await refresh();
        }}
      />
    </>
  );
}
