import { useState } from "react";

export default function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="w-80 min-h-96 bg-gray-950 text-white p-4 flex flex-col gap-4">
      <h1 className="text-lg font-bold text-center">
        {isLogin ? "Login" : "Sign Up"}
      </h1>

      <form className="flex flex-col gap-4">
        {!isLogin && (
          <input
            type="text"
            placeholder="Username"
            className="bg-gray-800 rounded-lg p-2 text-sm"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          className="bg-gray-800 rounded-lg p-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          className="bg-gray-800 rounded-lg p-2 text-sm"
        />
        <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg py-2 text-sm">
          {isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="text-xs text-gray-400 hover:text-white"
      >
        {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
      </button>
    </div>
  );
}