// components/AuthModal.tsx
import { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: (email: string) => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // 👈 新增：错误提示状态

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(""); // 每次提交前清空旧错误

    // 模拟网络请求的延迟，显得更真实
    setTimeout(() => {
      try {
        // 1. 获取本地的所有用户数据（模拟查询数据库）
        const usersJson = localStorage.getItem("getplanned_users");
        const users = usersJson ? JSON.parse(usersJson) : [];

        if (isLogin) {
          // ── 登录逻辑 ──
          const existingUser = users.find((u: any) => u.email === email);
          
          if (!existingUser) {
            setErrorMsg("Account does not exist. Please sign up first."); // 账号不存在
            setLoading(false);
            return;
          }
          
          if (existingUser.password !== password) {
            setErrorMsg("Incorrect password. Please try again."); // 密码错误
            setLoading(false);
            return;
          }

          // 登录成功
          localStorage.setItem("getplanned_current_user", email);
          onClose(email);

        } else {
          // ── 注册逻辑 ──
          const userExists = users.some((u: any) => u.email === email);
          
          if (userExists) {
            setErrorMsg("Account already exists. Please log in."); // 账号已存在
            setLoading(false);
            return;
          }

          // 注册成功：将新用户存入本地数组
          users.push({ email, password });
          localStorage.setItem("getplanned_users", JSON.stringify(users));
          
          // 注册后自动登录
          localStorage.setItem("getplanned_current_user", email);
          onClose(email);
        }
      } catch (err) {
        setErrorMsg("System error. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={() => onClose("")}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isLogin ? "Welcome Back" : "Create an Account"}</h2>
        <p className="modal-subtitle">
          {isLogin ? "Log in to manage your schedule." : "Sign up to start planning your days."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {/* 👈 渲染错误提示框 */}
          {errorMsg && <div className="auth-error">{errorMsg}</div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }}>
            {isLogin ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
}