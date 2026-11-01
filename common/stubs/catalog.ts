/** Stub page catalog — Vue-aligned skeletons until real models land. */
export type StubKind = "list" | "settings" | "chart";
export type StubCol = { prop: string; label: { "zh-CN": string; "en-US": string } };
export type StubSearch = { name: string; label: { "zh-CN": string; "en-US": string }; placeholder?: { "zh-CN": string; "en-US": string } };
export type StubSetting = { label: { "zh-CN": string; "en-US": string }; value: string };
export type StubPage = {
  key: string;
  module: string;
  path: string;
  title: { "zh-CN": string; "en-US": string };
  kind: StubKind;
  columns: StubCol[];
  /** Vue CardPanel search.schemas — demo UI only until models exist. */
  searchFields?: StubSearch[];
  settings: StubSetting[];
  icon: string;
  sort: number;
  parent: string;
};

export const STUB_PAGES: StubPage[] = [
  {
    key: "system.admin-log",
    module: "system",
    path: "/system/admin-log",
    title: { "zh-CN": "管理员日志列表", "en-US": "Admin logs" },
    kind: "list",
    columns: [
      { prop: "admin", label: { "zh-CN": "管理员", "en-US": "Admin" } },
      { prop: "title", label: { "zh-CN": "访问页面", "en-US": "Page" } },
      { prop: "path", label: { "zh-CN": "访问路径", "en-US": "Path" } },
      { prop: "method", label: { "zh-CN": "请求方法", "en-US": "Method" } },
      { prop: "status", label: { "zh-CN": "请求状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 30,
    parent: "system",
  },
  {
    key: "system.express",
    module: "system",
    path: "/system/express",
    title: { "zh-CN": "快递公司列表", "en-US": "Express companies" },
    kind: "list",
    columns: [
      { prop: "name", label: { "zh-CN": "公司名称", "en-US": "Name" } },
      { prop: "code", label: { "zh-CN": "公司编码", "en-US": "Code" } },
      { prop: "type", label: { "zh-CN": "快递类型", "en-US": "Type" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 40,
    parent: "system",
  },
  {
    key: "system.level",
    module: "system",
    path: "/system/level",
    title: { "zh-CN": "会员级别列表", "en-US": "Member levels" },
    kind: "list",
    columns: [
      { prop: "name", label: { "zh-CN": "级别名称", "en-US": "Name" } },
      { prop: "amount", label: { "zh-CN": "购买金额", "en-US": "Amount" } },
      { prop: "invite", label: { "zh-CN": "推荐人数", "en-US": "Invites" } },
      { prop: "status", label: { "zh-CN": "是否启用", "en-US": "Enabled" } },
      { prop: "info", label: { "zh-CN": "级别描述", "en-US": "Info" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "star",
    sort: 50,
    parent: "system",
  },
  {
    key: "system.locale",
    module: "system",
    path: "/system/locale",
    title: { "zh-CN": "本地化管理", "en-US": "Localization" },
    kind: "list",
    columns: [
      { prop: "locale", label: { "zh-CN": "词汇", "en-US": "Phrase" } },
      { prop: "zh", label: { "zh-CN": "中文", "en-US": "Chinese" } },
      { prop: "en", label: { "zh-CN": "英文", "en-US": "English" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 60,
    parent: "system",
  },
  {
    key: "system.region",
    module: "system",
    path: "/system/region",
    title: { "zh-CN": "地区列表", "en-US": "Regions" },
    kind: "list",
    columns: [
      { prop: "name", label: { "zh-CN": "地区名称", "en-US": "Name" } },
      { prop: "pname", label: { "zh-CN": "父级地区", "en-US": "Parent" } },
      { prop: "level", label: { "zh-CN": "等级", "en-US": "Level" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "grid",
    sort: 70,
    parent: "system",
  },
  {
    key: "system.base",
    module: "system",
    path: "/system/base",
    title: { "zh-CN": "基本设置", "en-US": "Base settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "网站名称", "en-US": "Site name" }, value: "Dreamer Admin" },
      { label: { "zh-CN": "公司名称", "en-US": "Company" }, value: "Demo Co." },
      { label: { "zh-CN": "验证码类型", "en-US": "Captcha" }, value: "字符验证码 / Character" },
      { label: { "zh-CN": "默认语言", "en-US": "Default locale" }, value: "zh-CN" },
      { label: { "zh-CN": "默认分页", "en-US": "Page size" }, value: "20" },
      { label: { "zh-CN": "日期时间格式", "en-US": "Datetime format" }, value: "YYYY-MM-DD HH:mm:ss" }
    ],
    icon: "sliders",
    sort: 80,
    parent: "system",
  },
  {
    key: "system.bonus",
    module: "system",
    path: "/system/bonus",
    title: { "zh-CN": "奖金设置", "en-US": "Bonus settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "奖金1", "en-US": "Bonus 1" }, value: "直推奖 / Direct" },
      { label: { "zh-CN": "奖金2", "en-US": "Bonus 2" }, value: "团队奖 / Team" },
      { label: { "zh-CN": "启用奖金1", "en-US": "Enable bonus 1" }, value: "开启 / On" },
      { label: { "zh-CN": "启用奖金2", "en-US": "Enable bonus 2" }, value: "开启 / On" }
    ],
    icon: "star",
    sort: 90,
    parent: "system",
  },
  {
    key: "system.datetime",
    module: "system",
    path: "/system/datetime",
    title: { "zh-CN": "时间设置", "en-US": "Datetime settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "服务器时间", "en-US": "Server time" }, value: "(demo clock)" },
      { label: { "zh-CN": "时区", "en-US": "Timezone" }, value: "Asia/Shanghai" },
      { label: { "zh-CN": "偏移秒", "en-US": "Offset seconds" }, value: "0" }
    ],
    icon: "sliders",
    sort: 100,
    parent: "system",
  },
  {
    key: "system.finance",
    module: "system",
    path: "/system/finance",
    title: { "zh-CN": "财务设置", "en-US": "Finance settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "转账手续费", "en-US": "Transfer fee" }, value: "1%" },
      { label: { "zh-CN": "提现手续费", "en-US": "Withdraw fee" }, value: "2%" },
      { label: { "zh-CN": "兑换手续费", "en-US": "Exchange fee" }, value: "0.5%" },
      { label: { "zh-CN": "交易手续费", "en-US": "Trade fee" }, value: "0.3%" }
    ],
    icon: "sliders",
    sort: 110,
    parent: "system",
  },
  {
    key: "system.transfer",
    module: "system",
    path: "/system/transfer",
    title: { "zh-CN": "转账设置", "en-US": "Transfer settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "钱包1转账", "en-US": "Wallet 1 transfer" }, value: "允许 / Allow" },
      { label: { "zh-CN": "钱包2转账", "en-US": "Wallet 2 transfer" }, value: "允许 / Allow" },
      { label: { "zh-CN": "最低转账", "en-US": "Min transfer" }, value: "10" },
      { label: { "zh-CN": "最高转账", "en-US": "Max transfer" }, value: "100000" }
    ],
    icon: "sliders",
    sort: 120,
    parent: "system",
  },
  {
    key: "system.wallet",
    module: "system",
    path: "/system/wallet",
    title: { "zh-CN": "钱包设置", "en-US": "Wallet settings" },
    kind: "settings",
    columns: [

    ],
    settings: [
      { label: { "zh-CN": "钱包1", "en-US": "Wallet 1" }, value: "开启 / On" },
      { label: { "zh-CN": "钱包2", "en-US": "Wallet 2" }, value: "开启 / On" },
      { label: { "zh-CN": "钱包3", "en-US": "Wallet 3" }, value: "关闭 / Off" },
      { label: { "zh-CN": "钱包名称1", "en-US": "Wallet 1 name" }, value: "余额 / Balance" }
    ],
    icon: "sliders",
    sort: 130,
    parent: "system",
  },
  {
    key: "user.index",
    module: "user",
    path: "/user",
    title: { "zh-CN": "会员列表", "en-US": "Members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 10,
    parent: "user",
  },
  {
    key: "user.new",
    module: "user",
    path: "/user/new",
    title: { "zh-CN": "新增会员", "en-US": "New members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 20,
    parent: "user",
  },
  {
    key: "user.active",
    module: "user",
    path: "/user/active",
    title: { "zh-CN": "活跃会员", "en-US": "Active members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 30,
    parent: "user",
  },
  {
    key: "user.black",
    module: "user",
    path: "/user/black",
    title: { "zh-CN": "黑名单会员", "en-US": "Blacklist" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 40,
    parent: "user",
  },
  {
    key: "user.locked",
    module: "user",
    path: "/user/locked",
    title: { "zh-CN": "锁定会员", "en-US": "Locked members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 50,
    parent: "user",
  },
  {
    key: "user.zombie",
    module: "user",
    path: "/user/zombie",
    title: { "zh-CN": "僵尸会员", "en-US": "Zombie members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" } },
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "email", label: { "zh-CN": "邮箱", "en-US": "Email" } },
      { prop: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" } },
      { prop: "status", label: { "zh-CN": "用户状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "nickname", label: { "zh-CN": "昵称", "en-US": "Nickname" }, placeholder: { "zh-CN": "请输入昵称查询", "en-US": "Search Nickname" } },
      { name: "email", label: { "zh-CN": "邮箱", "en-US": "Email" }, placeholder: { "zh-CN": "请输入邮箱查询", "en-US": "Search Email" } },
      { name: "mobile", label: { "zh-CN": "手机号", "en-US": "Mobile" }, placeholder: { "zh-CN": "请输入手机号查询", "en-US": "Search Mobile" } },
      { name: "status", label: { "zh-CN": "用户状态", "en-US": "Status" }, placeholder: { "zh-CN": "请输入用户状态查询", "en-US": "Search Status" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 60,
    parent: "user",
  },
  {
    key: "user.online",
    module: "user",
    path: "/user/online",
    title: { "zh-CN": "在线会员", "en-US": "Online members" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "title", label: { "zh-CN": "页面", "en-US": "Page" } },
      { prop: "browser", label: { "zh-CN": "浏览器", "en-US": "Browser" } },
      { prop: "device", label: { "zh-CN": "设备", "en-US": "Device" } },
      { prop: "language", label: { "zh-CN": "语言", "en-US": "Language" } },
      { prop: "updatedAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "会员", "en-US": "Member" }, placeholder: { "zh-CN": "请输入会员查询", "en-US": "Search Member" } },
      { name: "title", label: { "zh-CN": "页面", "en-US": "Page" }, placeholder: { "zh-CN": "请输入页面查询", "en-US": "Search Page" } }
    ],
    settings: [

    ],
    icon: "users",
    sort: 70,
    parent: "user",
  },
  {
    key: "user.log",
    module: "user",
    path: "/user/log",
    title: { "zh-CN": "会员日志列表", "en-US": "Member logs" },
    kind: "list",
    columns: [
      { prop: "user", label: { "zh-CN": "用户", "en-US": "User" } },
      { prop: "title", label: { "zh-CN": "访问页面", "en-US": "Page" } },
      { prop: "path", label: { "zh-CN": "访问路径", "en-US": "Path" } },
      { prop: "method", label: { "zh-CN": "请求方法", "en-US": "Method" } },
      { prop: "success", label: { "zh-CN": "请求结果", "en-US": "Result" } },
      { prop: "createdAt", label: { "zh-CN": "操作时间", "en-US": "Operated" } }
    ],
    searchFields: [
      { name: "user", label: { "zh-CN": "用户", "en-US": "User" }, placeholder: { "zh-CN": "请输入用户查询", "en-US": "Search User" } },
      { name: "title", label: { "zh-CN": "访问页面", "en-US": "Page" }, placeholder: { "zh-CN": "请输入访问页面查询", "en-US": "Search Page" } },
      { name: "path", label: { "zh-CN": "访问路径", "en-US": "Path" }, placeholder: { "zh-CN": "请输入访问路径查询", "en-US": "Search Path" } },
      { name: "method", label: { "zh-CN": "请求方法", "en-US": "Method" }, placeholder: { "zh-CN": "请输入请求方法查询", "en-US": "Search Method" } },
      { name: "success", label: { "zh-CN": "请求结果", "en-US": "Result" }, placeholder: { "zh-CN": "请输入请求结果查询", "en-US": "Search Result" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 80,
    parent: "user",
  },
  {
    key: "user.receipt",
    module: "user",
    path: "/user/receipt",
    title: { "zh-CN": "收款方式列表", "en-US": "Receipt methods" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "type", label: { "zh-CN": "类型", "en-US": "Type" } },
      { prop: "account", label: { "zh-CN": "账号", "en-US": "Account" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 90,
    parent: "user",
  },
  {
    key: "user.upgrade-log",
    module: "user",
    path: "/user/upgrade-log",
    title: { "zh-CN": "升级记录列表", "en-US": "Upgrade logs" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "用户名", "en-US": "Username" } },
      { prop: "oldLevel", label: { "zh-CN": "旧级别", "en-US": "Old level" } },
      { prop: "newLevel", label: { "zh-CN": "新级别", "en-US": "New level" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "username", label: { "zh-CN": "用户名", "en-US": "Username" }, placeholder: { "zh-CN": "请输入用户名查询", "en-US": "Search Username" } },
      { name: "old_level", label: { "zh-CN": "旧级别", "en-US": "Old level" }, placeholder: { "zh-CN": "请输入旧级别查询", "en-US": "Search Old level" } },
      { name: "new_level", label: { "zh-CN": "新级别", "en-US": "New level" }, placeholder: { "zh-CN": "请输入新级别查询", "en-US": "Search New level" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 100,
    parent: "user",
  },
  {
    key: "user.location",
    module: "user",
    path: "/user/location",
    title: { "zh-CN": "会员分布图", "en-US": "Member map" },
    kind: "chart",
    columns: [

    ],
    settings: [

    ],
    icon: "grid",
    sort: 110,
    parent: "user",
  },
  {
    key: "user.path-invite",
    module: "user",
    path: "/user/path-invite",
    title: { "zh-CN": "推荐图", "en-US": "Invite tree" },
    kind: "chart",
    columns: [

    ],
    settings: [

    ],
    icon: "grid",
    sort: 120,
    parent: "user",
  },
  {
    key: "user.path-position",
    module: "user",
    path: "/user/path-position",
    title: { "zh-CN": "安置图", "en-US": "Placement tree" },
    kind: "chart",
    columns: [

    ],
    settings: [

    ],
    icon: "grid",
    sort: 130,
    parent: "user",
  },
  {
    key: "cms.article",
    module: "cms",
    path: "/cms/article",
    title: { "zh-CN": "文章列表", "en-US": "Articles" },
    kind: "list",
    columns: [
      { prop: "category", label: { "zh-CN": "分类", "en-US": "Category" } },
      { prop: "title", label: { "zh-CN": "标题", "en-US": "Title" } },
      { prop: "source", label: { "zh-CN": "来源", "en-US": "Source" } },
      { prop: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "category", label: { "zh-CN": "分类", "en-US": "Category" }, placeholder: { "zh-CN": "请输入分类查询", "en-US": "Search Category" } },
      { name: "title", label: { "zh-CN": "标题", "en-US": "Title" }, placeholder: { "zh-CN": "请输入标题查询", "en-US": "Search Title" } },
      { name: "source", label: { "zh-CN": "来源", "en-US": "Source" }, placeholder: { "zh-CN": "请输入来源查询", "en-US": "Search Source" } },
      { name: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" }, placeholder: { "zh-CN": "请输入阅读量查询", "en-US": "Search Views" } },
      { name: "start", label: { "zh-CN": "开始时间", "en-US": "Start" }, placeholder: { "zh-CN": "请输入开始时间查询", "en-US": "Search Start" } },
      { name: "end", label: { "zh-CN": "结束时间", "en-US": "End" }, placeholder: { "zh-CN": "请输入结束时间查询", "en-US": "Search End" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 10,
    parent: "cms",
  },
  {
    key: "cms.news",
    module: "cms",
    path: "/cms/news",
    title: { "zh-CN": "新闻列表", "en-US": "News" },
    kind: "list",
    columns: [
      { prop: "title", label: { "zh-CN": "文章标题", "en-US": "Article title" } },
      { prop: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "title", label: { "zh-CN": "文章标题", "en-US": "Article title" }, placeholder: { "zh-CN": "请输入文章标题查询", "en-US": "Search Article title" } },
      { name: "content", label: { "zh-CN": "文章内容", "en-US": "Body" }, placeholder: { "zh-CN": "请输入文章内容查询", "en-US": "Search Body" } },
      { name: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" }, placeholder: { "zh-CN": "请输入阅读量查询", "en-US": "Search Views" } },
      { name: "created_at", label: { "zh-CN": "创建时间", "en-US": "Created" }, placeholder: { "zh-CN": "请输入创建时间查询", "en-US": "Search Created" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 20,
    parent: "cms",
  },
  {
    key: "cms.notice",
    module: "cms",
    path: "/cms/notice",
    title: { "zh-CN": "公告列表", "en-US": "Notices" },
    kind: "list",
    columns: [
      { prop: "title", label: { "zh-CN": "公告标题", "en-US": "Notice title" } },
      { prop: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "title", label: { "zh-CN": "公告标题", "en-US": "Notice title" }, placeholder: { "zh-CN": "请输入公告标题查询", "en-US": "Search Notice title" } },
      { name: "content", label: { "zh-CN": "公告内容", "en-US": "Notice body" }, placeholder: { "zh-CN": "请输入公告内容查询", "en-US": "Search Notice body" } },
      { name: "visits", label: { "zh-CN": "阅读量", "en-US": "Views" }, placeholder: { "zh-CN": "请输入阅读量查询", "en-US": "Search Views" } },
      { name: "created_at", label: { "zh-CN": "创建时间", "en-US": "Created" }, placeholder: { "zh-CN": "请输入创建时间查询", "en-US": "Search Created" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 30,
    parent: "cms",
  },
  {
    key: "cms.photo",
    module: "cms",
    path: "/cms/photo",
    title: { "zh-CN": "相册列表", "en-US": "Albums" },
    kind: "list",
    columns: [
      { prop: "category", label: { "zh-CN": "相册分类", "en-US": "Album category" } },
      { prop: "title", label: { "zh-CN": "相册标题", "en-US": "Album title" } },
      { prop: "images", label: { "zh-CN": "相册图片", "en-US": "Images" } },
      { prop: "visits", label: { "zh-CN": "查看量", "en-US": "Views" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "category", label: { "zh-CN": "相册分类", "en-US": "Album category" }, placeholder: { "zh-CN": "请输入相册分类查询", "en-US": "Search Album category" } },
      { name: "title", label: { "zh-CN": "相册标题", "en-US": "Album title" }, placeholder: { "zh-CN": "请输入相册标题查询", "en-US": "Search Album title" } },
      { name: "images", label: { "zh-CN": "相册图片", "en-US": "Images" }, placeholder: { "zh-CN": "请输入相册图片查询", "en-US": "Search Images" } },
      { name: "visits", label: { "zh-CN": "查看量", "en-US": "Views" }, placeholder: { "zh-CN": "请输入查看量查询", "en-US": "Search Views" } },
      { name: "created_at", label: { "zh-CN": "创建时间", "en-US": "Created" }, placeholder: { "zh-CN": "请输入创建时间查询", "en-US": "Search Created" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 40,
    parent: "cms",
  },
  {
    key: "cms.qa",
    module: "cms",
    path: "/cms/qa",
    title: { "zh-CN": "问答列表", "en-US": "Q&A" },
    kind: "list",
    columns: [
      { prop: "question", label: { "zh-CN": "问题", "en-US": "Question" } },
      { prop: "answers", label: { "zh-CN": "答案", "en-US": "Answers" } },
      { prop: "right", label: { "zh-CN": "正确答案", "en-US": "Correct" } },
      { prop: "status", label: { "zh-CN": "是否启用", "en-US": "Enabled" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "question", label: { "zh-CN": "问题", "en-US": "Question" }, placeholder: { "zh-CN": "请输入问题查询", "en-US": "Search Question" } },
      { name: "answers", label: { "zh-CN": "答案", "en-US": "Answers" }, placeholder: { "zh-CN": "请输入答案查询", "en-US": "Search Answers" } },
      { name: "right", label: { "zh-CN": "正确答案", "en-US": "Correct" }, placeholder: { "zh-CN": "请输入正确答案查询", "en-US": "Search Correct" } },
      { name: "status", label: { "zh-CN": "是否启用", "en-US": "Enabled" }, placeholder: { "zh-CN": "请输入是否启用查询", "en-US": "Search Enabled" } },
      { name: "created_at", label: { "zh-CN": "创建时间", "en-US": "Created" }, placeholder: { "zh-CN": "请输入创建时间查询", "en-US": "Search Created" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 50,
    parent: "cms",
  },
  {
    key: "cms.survey",
    module: "cms",
    path: "/cms/survey",
    title: { "zh-CN": "问卷调查列表", "en-US": "Surveys" },
    kind: "list",
    columns: [
      { prop: "question", label: { "zh-CN": "问题", "en-US": "Question" } },
      { prop: "status", label: { "zh-CN": "是否启用", "en-US": "Enabled" } },
      { prop: "createdAt", label: { "zh-CN": "创建时间", "en-US": "Created" } }
    ],
    searchFields: [
      { name: "question", label: { "zh-CN": "问题", "en-US": "Question" }, placeholder: { "zh-CN": "请输入问题查询", "en-US": "Search Question" } },
      { name: "status", label: { "zh-CN": "是否启用", "en-US": "Enabled" }, placeholder: { "zh-CN": "请输入是否启用查询", "en-US": "Search Enabled" } },
      { name: "created_at", label: { "zh-CN": "创建时间", "en-US": "Created" }, placeholder: { "zh-CN": "请输入创建时间查询", "en-US": "Search Created" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 60,
    parent: "cms",
  },
  {
    key: "finance.bonus",
    module: "finance",
    path: "/finance/bonus",
    title: { "zh-CN": "奖金列表", "en-US": "Bonus list" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "star",
    sort: 10,
    parent: "finance",
  },
  {
    key: "finance.bonus-log",
    module: "finance",
    path: "/finance/bonus/log",
    title: { "zh-CN": "奖金日志", "en-US": "Bonus logs" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 15,
    parent: "finance",
  },
  {
    key: "finance.invest",
    module: "finance",
    path: "/finance/invest",
    title: { "zh-CN": "投资记录列表", "en-US": "Invest records" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 20,
    parent: "finance",
  },
  {
    key: "finance.point",
    module: "finance",
    path: "/finance/point",
    title: { "zh-CN": "积分列表", "en-US": "Points" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 30,
    parent: "finance",
  },
  {
    key: "finance.recharge",
    module: "finance",
    path: "/finance/recharge",
    title: { "zh-CN": "充值记录列表", "en-US": "Recharges" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 40,
    parent: "finance",
  },
  {
    key: "finance.wallet",
    module: "finance",
    path: "/finance/wallet",
    title: { "zh-CN": "钱包列表", "en-US": "Wallets" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "wallet", label: { "zh-CN": "钱包", "en-US": "Wallet" } },
      { prop: "balance", label: { "zh-CN": "余额", "en-US": "Balance" } },
      { prop: "updatedAt", label: { "zh-CN": "更新时间", "en-US": "Updated" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 50,
    parent: "finance",
  },
  {
    key: "finance.wallet-add-sub",
    module: "finance",
    path: "/finance/wallet/add-sub",
    title: { "zh-CN": "钱包加减款", "en-US": "Wallet adjust" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "sliders",
    sort: 55,
    parent: "finance",
  },
  {
    key: "finance.wallet-log",
    module: "finance",
    path: "/finance/wallet/log",
    title: { "zh-CN": "钱包日志", "en-US": "Wallet logs" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 58,
    parent: "finance",
  },
  {
    key: "finance.withdraw",
    module: "finance",
    path: "/finance/withdraw",
    title: { "zh-CN": "提现列表", "en-US": "Withdrawals" },
    kind: "list",
    columns: [
      { prop: "username", label: { "zh-CN": "账号", "en-US": "Username" } },
      { prop: "amount", label: { "zh-CN": "金额", "en-US": "Amount" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 60,
    parent: "finance",
  },
  {
    key: "count.bonus",
    module: "count",
    path: "/count/bonus",
    title: { "zh-CN": "奖金统计表", "en-US": "Bonus stats" },
    kind: "list",
    columns: [
      { prop: "period", label: { "zh-CN": "周期", "en-US": "Period" } },
      { prop: "total", label: { "zh-CN": "合计", "en-US": "Total" } },
      { prop: "count", label: { "zh-CN": "笔数", "en-US": "Count" } },
      { prop: "remark", label: { "zh-CN": "备注", "en-US": "Remark" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 10,
    parent: "count",
  },
  {
    key: "count.invest",
    module: "count",
    path: "/count/invest",
    title: { "zh-CN": "投资统计表", "en-US": "Invest stats" },
    kind: "list",
    columns: [
      { prop: "period", label: { "zh-CN": "周期", "en-US": "Period" } },
      { prop: "total", label: { "zh-CN": "合计", "en-US": "Total" } },
      { prop: "count", label: { "zh-CN": "笔数", "en-US": "Count" } },
      { prop: "remark", label: { "zh-CN": "备注", "en-US": "Remark" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 20,
    parent: "count",
  },
  {
    key: "count.point",
    module: "count",
    path: "/count/point",
    title: { "zh-CN": "业绩统计表", "en-US": "Point stats" },
    kind: "list",
    columns: [
      { prop: "period", label: { "zh-CN": "周期", "en-US": "Period" } },
      { prop: "total", label: { "zh-CN": "合计", "en-US": "Total" } },
      { prop: "count", label: { "zh-CN": "笔数", "en-US": "Count" } },
      { prop: "remark", label: { "zh-CN": "备注", "en-US": "Remark" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 30,
    parent: "count",
  },
  {
    key: "count.recharge",
    module: "count",
    path: "/count/recharge",
    title: { "zh-CN": "充值统计表", "en-US": "Recharge stats" },
    kind: "list",
    columns: [
      { prop: "period", label: { "zh-CN": "周期", "en-US": "Period" } },
      { prop: "total", label: { "zh-CN": "合计", "en-US": "Total" } },
      { prop: "count", label: { "zh-CN": "笔数", "en-US": "Count" } },
      { prop: "remark", label: { "zh-CN": "备注", "en-US": "Remark" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 40,
    parent: "count",
  },
  {
    key: "count.withdraw",
    module: "count",
    path: "/count/withdraw",
    title: { "zh-CN": "提现统计表", "en-US": "Withdraw stats" },
    kind: "list",
    columns: [
      { prop: "period", label: { "zh-CN": "周期", "en-US": "Period" } },
      { prop: "total", label: { "zh-CN": "合计", "en-US": "Total" } },
      { prop: "count", label: { "zh-CN": "笔数", "en-US": "Count" } },
      { prop: "remark", label: { "zh-CN": "备注", "en-US": "Remark" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 50,
    parent: "count",
  },
  {
    key: "developer.database",
    module: "developer",
    path: "/developer/database",
    title: { "zh-CN": "数据备份列表", "en-US": "DB backups" },
    kind: "list",
    columns: [
      { prop: "name", label: { "zh-CN": "备份名", "en-US": "Name" } },
      { prop: "size", label: { "zh-CN": "大小", "en-US": "Size" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "database",
    sort: 10,
    parent: "developer",
  },
  {
    key: "developer.feedback",
    module: "developer",
    path: "/developer/feedback",
    title: { "zh-CN": "问题反馈列表", "en-US": "Feedback" },
    kind: "list",
    columns: [
      { prop: "title", label: { "zh-CN": "标题", "en-US": "Title" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } },
      { prop: "user", label: { "zh-CN": "用户", "en-US": "User" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Created" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 20,
    parent: "developer",
  },
  {
    key: "developer.language",
    module: "developer",
    path: "/developer/language",
    title: { "zh-CN": "系统语言列表", "en-US": "Languages" },
    kind: "list",
    columns: [
      { prop: "code", label: { "zh-CN": "代码", "en-US": "Code" } },
      { prop: "name", label: { "zh-CN": "名称", "en-US": "Name" } },
      { prop: "status", label: { "zh-CN": "状态", "en-US": "Status" } }
    ],
    settings: [

    ],
    icon: "book",
    sort: 30,
    parent: "developer",
  },
  {
    key: "developer.system",
    module: "developer",
    path: "/developer/system",
    title: { "zh-CN": "系统日志列表", "en-US": "System logs" },
    kind: "list",
    columns: [
      { prop: "level", label: { "zh-CN": "级别", "en-US": "Level" } },
      { prop: "message", label: { "zh-CN": "消息", "en-US": "Message" } },
      { prop: "createdAt", label: { "zh-CN": "时间", "en-US": "Time" } }
    ],
    settings: [

    ],
    icon: "list",
    sort: 40,
    parent: "developer",
  },
];

export const STUB_BY_KEY: Record<string, StubPage> = Object.fromEntries(
  STUB_PAGES.map((p) => [p.key, p]),
);

