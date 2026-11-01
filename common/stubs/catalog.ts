/** Stub page catalog — Vue-aligned skeletons until real models land.
 * Member(3) + CMS(4) have NO domain models in common/model — keep StubList; see docs/handoff.md. */
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
    key: "system.region",
    module: "system",
    path: "/system/region",
    title: { "zh-CN": "地区列表", "en-US": "Regions" },
    kind: "list",
    columns: [
      { prop: "name", label: { "zh-CN": "地区名称", "en-US": "Name" } },
      { prop: "pname", label: { "zh-CN": "父级地区", "en-US": "Parent" } },
      { prop: "level", label: { "zh-CN": "等级", "en-US": "Level" } },
    ],
    searchFields: [
      { name: "gid", label: { "zh-CN": "区域ID", "en-US": "Region ID" }, placeholder: { "zh-CN": "请输入区域ID查询", "en-US": "Search region ID" } },
      { name: "pid", label: { "zh-CN": "父级ID", "en-US": "Parent ID" }, placeholder: { "zh-CN": "请输入父级ID查询", "en-US": "Search parent ID" } },
      { name: "name", label: { "zh-CN": "名称", "en-US": "Name" }, placeholder: { "zh-CN": "请输入名称查询", "en-US": "Search name" } },
      { name: "level", label: { "zh-CN": "等级", "en-US": "Level" }, placeholder: { "zh-CN": "请输入等级查询", "en-US": "Search level" } },
    ],
    settings: [],
    icon: "compass",
    sort: 20,
    parent: "system",
  },
  {
    key: "system.base",
    module: "system",
    path: "/system/base",
    title: { "zh-CN": "基本设置", "en-US": "Base settings" },
    kind: "settings",
    columns: [],
    settings: [
      { label: { "zh-CN": "网站名称", "en-US": "Site name" }, value: "Dweb 管理后台" },
      { label: { "zh-CN": "公司名称", "en-US": "Company" }, value: "Demo Co." },
      { label: { "zh-CN": "验证码类型", "en-US": "Captcha" }, value: "字符验证码 / Character" },
      { label: { "zh-CN": "年份格式", "en-US": "Year format" }, value: "YYYY" },
      { label: { "zh-CN": "月份格式", "en-US": "Month format" }, value: "YYYY-MM" },
      { label: { "zh-CN": "日期格式", "en-US": "Date format" }, value: "YYYY-MM-DD" },
      { label: { "zh-CN": "日期时间格式", "en-US": "Datetime format" }, value: "YYYY-MM-DD HH:mm:ss" },
      { label: { "zh-CN": "默认语言", "en-US": "Default locale" }, value: "zh-CN" },
      { label: { "zh-CN": "默认分页", "en-US": "Page size" }, value: "20" },
    ],
    icon: "sliders",
    sort: 10,
    parent: "system",
  },
  {
    key: "system.datetime",
    module: "system",
    path: "/system/datetime",
    title: { "zh-CN": "时间设置", "en-US": "Datetime settings" },
    kind: "settings",
    columns: [],
    settings: [
      { label: { "zh-CN": "时区", "en-US": "Timezone" }, value: "Asia/Shanghai" },
      { label: { "zh-CN": "偏移秒", "en-US": "Offset seconds" }, value: "0" },
    ],
    icon: "clock",
    sort: 30,
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
    icon: "star",
    sort: 10,
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
    icon: "star",
    sort: 20,
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
    icon: "star",
    sort: 30,
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
    icon: "star",
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
    icon: "star",
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
    icon: "star",
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
    icon: "star",
    sort: 40,
    parent: "cms",
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
    icon: "star",
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
    icon: "star",
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
    icon: "star",
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
    icon: "star",
    sort: 40,
    parent: "developer",
  },

];

export const STUB_BY_KEY: Record<string, StubPage> = Object.fromEntries(
  STUB_PAGES.map((p) => [p.key, p]),
);

