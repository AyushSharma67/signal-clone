"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://127.0.0.1:8000";

export default function VerifyPage() {
    const router = useRouter();

    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleVerify(e: FormEvent) {
        e.preventDefault();

        setError("");
        setLoading(true);

        const username = localStorage.getItem("pendingUsername");

        if (!username) {
            setError("Registration session expired.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth/verify-otp`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    otp,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Invalid OTP");
            }

            localStorage.removeItem("pendingUsername");

            router.push("/login");
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
                        Verify your account
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Enter the 6-digit OTP
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">

                    <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-xl tracking-[0.5em] text-gray-900 placeholder-gray-500 outline-none focus:border-black"
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
                        {loading ? "Verifying..." : "Verify"}
                    </button>

                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    For this assignment, use OTP{" "}
                    <span className="font-semibold text-black">
                        123456
                    </span>
                </p>

            </div>
        </main>
    );
}