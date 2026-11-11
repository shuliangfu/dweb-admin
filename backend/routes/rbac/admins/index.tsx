/**
 * 管理员列表：ui-view DataPanel 直写本页（1.3 参照页）。
 * - 列 align／roleCodes Tag；表单 rules（弱密码／确认密码）；
 * - 改密 Modal 用 createForm；详情底栏「密码」打开（行操作不挂密码）。
 */
import type { LoadContext } from "@dreamer/dweb";
import { createSignal } from "@dreamer/view";
import {
  Button,
  type Column,
  createForm,
  DataPanel,
  Form,
  FormItem,
  formRules,
  message,
  Modal,
  Password,
  type Row,
  Tag,
} from "@dreamer/ui-view";
import { api, csrfHeaders } from "@common/utils/client-api.ts";
import {
  isWeakPassword,
  WEAK_PASSWORD_MESSAGE,
} from "@common/utils/password-strength.ts";

const STATUS = [
  { value: "active", label: "启用", tone: "success" as const },
  { value: "disabled", label: "禁用", tone: "default" as const },
];

export async function load(_ctx: LoadContext) {
  const { roleOptions } = await import("@common/service/rbac-admin.ts");
  return { roles: await roleOptions("zh-CN") };
}

type Data = { roles?: { name: string; description: string }[] };

/** 解析行上的 roleCodes（数组或逗号分隔字符串） */
function roleCodeList(row: Row): string[] {
  const raw = row.roleCodes;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw ?? "").split(/[,，\s]+/).filter(Boolean);
}

/** 角色列／详情：Tag 列表 */
function renderRoleCodes(row: Row) {
  const codes = roleCodeList(row);
  if (!codes.length) {
    return <span class="text-xs text-slate-400">—</span>;
  }
  return (
    <span class="flex flex-wrap gap-1">
      {codes.map((c) => <Tag key={c} size="xs" variant="success">{c}</Tag>)}
    </span>
  );
}

type PwdValues = { password: string; password2: string };

export default function Page(props: { data?: Data } & Data) {
  const roles = ((props.data ?? props).roles ?? []).map((r) => ({
    value: r.name,
    label: r.description ? `${r.name} · ${r.description}` : r.name,
  }));

  const pwdOpen = createSignal(false);
  const pwdId = createSignal("");
  /** 改密表单 store（校验／绑定／submitting） */
  const pwdForm = createForm<PwdValues>({
    initialValues: { password: "", password2: "" },
    fields: {
      password: {
        rules: [
          formRules.required("请输入密码"),
          formRules.min(6, "请输入 6～64 位密码"),
          formRules.max(64, "请输入 6～64 位密码"),
          formRules.custom((value) => {
            const s = String(value ?? "");
            if (s && isWeakPassword(s)) return WEAK_PASSWORD_MESSAGE;
          }),
        ],
      },
      password2: {
        rules: [
          formRules.required("请确认密码"),
          formRules.equalsField("password", "两次密码不一致"),
        ],
      },
    },
  });

  /** 关闭并重置改密表单 */
  function closePassword() {
    pwdOpen.value = false;
    pwdId.value = "";
    pwdForm.resetFields();
  }

  /** 打开改密：清空校验态后写入目标 id */
  function openPassword(id: string) {
    pwdForm.resetFields();
    pwdId.value = id;
    pwdOpen.value = true;
  }

  /** 稳定绑定：勿在 Modal children getter 里每次 `bind()`／展开，否则输入会失焦 */
  const passwordBind = pwdForm.bind("password");
  const password2Bind = pwdForm.bind("password2");

  /** 校验通过后 POST /api/rbac/admins/password */
  async function submitPassword() {
    await pwdForm.submit(async (vals) => {
      const r = await api("POST", "/api/rbac/admins/password", {
        id: pwdId.value,
        password: vals.password,
        password2: vals.password2,
      });
      if (!r.ok) {
        const messages = (r.data as {
          messages?: { password?: string; password2?: string };
        }).messages;
        if (messages && (messages.password || messages.password2)) {
          pwdForm.setFieldsError({
            password: messages.password,
            password2: messages.password2,
          });
          return;
        }
        message.error(r.data.message || "修改密码失败");
        return;
      }
      message.success("密码已修改");
      closePassword();
    });
  }

  /** 表格列（与 search／form／view 同级抽出，避免 JSX 内堆配置） */
  const columns: Column[] = [
    { type: "selection" },
    { type: "index" },
    { prop: "username", label: "用户名", sortable: true },
    { prop: "nickname", label: "昵称", sortable: true },
    { prop: "email", label: "邮箱", sortable: true },
    {
      prop: "roleCodes",
      label: "角色",
      value: renderRoleCodes,
    },
    {
      prop: "status",
      label: "状态",
      type: "tag",
      inline: "switch",
      batch: true,
      align: "center",
      options: STATUS,
      sortable: true,
    },
    {
      prop: "loginCount",
      label: "登录次数",
      type: "number",
      sortable: true,
      headerAlign: "center",
    },
    { prop: "lastLoginIp", label: "登录IP", hidden: true },
    {
      prop: "lastLoginAt",
      label: "最后登录",
      type: "datetime",
      sortable: true,
      headerAlign: "center",
    },
    {
      prop: "createdAt",
      label: "创建时间",
      type: "datetime",
      sortable: true,
      headerAlign: "center",
    },
    {
      type: "actions",
      actions: {
        view: true,
        edit: true,
        remove: true,
      },
    },
  ];

  /** 搜索区字段 */
  const search = {
    props: [
      { prop: "username", label: "用户名" },
      { prop: "email", label: "邮箱" },
      {
        prop: "status",
        label: "状态",
        type: "select" as const,
        options: STATUS,
      },
    ],
  };

  /** 新建／编辑表单字段（roles 来自 load；密码仅 createOnly） */
  const form = {
    props: [
      {
        prop: "username",
        label: "用户名",
        createOnly: true,
        rules: [
          { required: true, message: "请输入用户名" },
          { min: 2, max: 32, message: "用户名 2～32 位" },
          {
            pattern: "^[A-Za-z][A-Za-z0-9_]*$",
            message: "字母开头，仅字母数字下划线",
          },
        ],
      },
      { prop: "nickname", label: "昵称", max: 64 },
      {
        prop: "email",
        label: "邮箱",
        rules: [
          { required: true, message: "请输入邮箱" },
          { type: "email" as const, message: "邮箱格式不正确" },
          { max: 128, message: "邮箱最多 128 字符" },
        ],
      },
      { prop: "avatar", label: "头像地址", max: 500 },
      {
        prop: "password",
        label: "密码",
        type: "password" as const,
        /** 仅新建：编辑态面板隐藏；改密走详情底栏「密码」Modal */
        createOnly: true,
        rules: [
          { required: true, message: "请输入密码" },
          { min: 6, max: 64, message: "请输入 6～64 位密码" },
          {
            validator: (value: unknown) => {
              const s = String(value ?? "");
              if (!s) return true;
              return isWeakPassword(s) ? WEAK_PASSWORD_MESSAGE : true;
            },
          },
        ],
      },
      {
        prop: "password2",
        label: "确认密码",
        type: "password" as const,
        createOnly: true,
        rules: [
          { required: true, message: "请确认密码" },
          {
            validator: (value: unknown, values: Record<string, unknown>) =>
              value === values.password ? true : "两次密码不一致",
          },
        ],
      },
      {
        prop: "roleCodes",
        label: "角色",
        type: "multiselect" as const,
        options: roles,
      },
      {
        prop: "lockMinutes",
        label: "自动锁屏（分钟，0=不锁）",
        type: "number" as const,
        min: 0,
        max: 1440,
        initial: 0,
      },
      {
        prop: "status",
        label: "状态",
        type: "switch" as const,
        onOff: ["active", "disabled"] as [string, string],
        initial: "active",
      },
    ],
  };

  /** 详情抽屉字段与底栏操作 */
  const view = {
    title: (row: Row) => `详情 · ${String(row.username ?? "")}`,
    props: [
      { prop: "username" },
      { prop: "nickname" },
      { prop: "email" },
      { prop: "avatar", label: "头像地址" },
      { prop: "roleCodes", label: "角色", value: renderRoleCodes },
      { prop: "status" },
      {
        prop: "lockMinutes",
        label: "自动锁屏（分钟）",
        type: "number" as const,
      },
      { prop: "loginCount" },
      { prop: "lastLoginIp" },
      { prop: "lastLoginAt" },
      { prop: "createdAt" },
    ],
    actions: {
      password: {
        label: "密码",
        action: (row: Row) => openPassword(String(row.id ?? "")),
      },
      close: true,
    },
  };

  return (
    <>
      <DataPanel
        title="管理员"
        panelKey="admins"
        baseRoute="/api"
        apiMode="action"
        /** POST 须带双提交 CSRF，否则中间件 403 → 面板显示 request failed */
        apiHeaders={() => csrfHeaders()}
        apiCredentials="same-origin"
        columns={columns}
        /** 能力闸：关掉用不到的内置能力，工具栏只声明开启项 */
        caps={{
          import: false,
          print: false,
          columns: false,
          density: false,
          fullscreen: false,
          copy: false,
        }}
        search={search}
        form={form}
        view={view}
        defaultSort={{ prop: "username", order: "asc" }}
        toolbar={{
          create: true,
          search: true,
          refresh: true,
          export: true,
        }}
        class="adm-data-panel adm-panel-card"
        pageSize={10}
      />
      <Modal
        open={pwdOpen}
        title="修改密码"
        width="sm"
        keyboard
        destroyOnClose
        onClose={closePassword}
        footer={() => (
          <div class="flex justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              loading={pwdForm.submitting.value}
              onClick={submitPassword}
            >
              确定
            </Button>
            <Button
              type="button"
              disabled={pwdForm.submitting.value}
              onClick={closePassword}
            >
              取消
            </Button>
          </div>
        )}
      >
        {
          /*
          勿用 children={() => …}：createMemo 会随 errors／value 整树重挂导致输入失焦。
          Form + FormItem name 从 store 细粒度订阅错误；Password 用稳定 Signal 绑定。
        */
        }
        <Form form={pwdForm} class="grid gap-3" data-testid="dp-password-form">
          <FormItem name="password" label="密码" required>
            <Password
              class="w-full"
              value={passwordBind.value}
              onInput={passwordBind.onInput}
              onChange={passwordBind.onChange}
              onBlur={passwordBind.onBlur}
              showStrength
              newPassword
              autoComplete
            />
          </FormItem>
          <FormItem name="password2" label="确认密码" required>
            <Password
              class="w-full"
              value={password2Bind.value}
              onInput={password2Bind.onInput}
              onChange={password2Bind.onChange}
              onBlur={password2Bind.onBlur}
              newPassword
              autoComplete
            />
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
