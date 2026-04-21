import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Bài viết / Blog đã được hợp nhất vào trang quản lý Nội Dung tại
 * `/admin/pages?tab=posts`. Component này chỉ điều hướng để các liên
 * kết cũ vẫn hoạt động.
 */
export default function AdminBlogs() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/admin/pages?tab=posts", { replace: true });
  }, [navigate]);
  return null;
}
