"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

export default function LoginPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: FormEvent) {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Login failed");
            }

            localStorage.setItem(
                "currentUser",
                JSON.stringify(data.user)
            );

            router.push("/");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">

                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold">
                        Signal
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Log in to continue
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:border-black"
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:border-black"
                    />

                    {error && (
                        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-black py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Log in"}
                    </button>

                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Don't have an account?{" "}
                    <button
                        onClick={() => router.push("/register")}
                        className="font-medium text-black"
                    >
                        Create account
                    </button>
                </p>

            </div>
        </main>
    );
}