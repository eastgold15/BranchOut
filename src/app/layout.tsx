import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "查漏补缺 - AI 知识树学习系统",
  description: "用 3D 知识树和嵌套卡片聊天，发现每一个知识薄弱点",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
