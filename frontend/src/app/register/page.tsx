"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleRegister(e: FormEvent) {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    phone,
                    display_name: displayName,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Registration failed");
            }

            // Save username temporarily for OTP page
            localStorage.setItem("pendingUsername", username);

            router.push("/verify");
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
                        Create your account
                    </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">

                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:border-black"
                    />

                    <input
                        type="text"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 outline-none focus:border-black"
                    />

                    <input
                        type="text"
                        placeholder="Display name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
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
                        {loading ? "Creating account..." : "Create account"}
                    </button>

                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <button
                        onClick={() => router.push("/login")}
                        className="font-medium text-black"
                    >
                        Log in
                    </button>
                </p>

            </div>
        </main>
    );
}