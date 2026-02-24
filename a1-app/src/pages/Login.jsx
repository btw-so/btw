import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP } from "../api";
import { useAuth } from "../auth";

export default function Login() {
    const navigate = useNavigate();
    const { login, isLoggedIn } = useAuth();
    const [step, setStep] = useState("phone"); // phone | otp
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const otpRefs = useRef([]);

    useEffect(() => {
        if (isLoggedIn) navigate("/chat", { replace: true });
    }, [isLoggedIn]);

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!phone.trim() || phone.trim().length < 8) return;

        setLoading(true);
        setError("");
        try {
            const res = await sendOTP(phone.trim());
            if (res.success) {
                setStep("otp");
                setTimeout(() => otpRefs.current[0]?.focus(), 50);
            } else {
                setError(res.error || "Failed to send code");
            }
        } catch {
            setError("Something went wrong. Try again.");
        }
        setLoading(false);
    };

    const handleVerify = async (digits) => {
        const code = digits.join("");
        if (code.length !== 6) return;

        setLoading(true);
        setError("");
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offset = new Date().getTimezoneOffset() * -60;

            const res = await verifyOTP({
                phone: phone.trim(),
                otp: code,
                timezone: tz,
                timezoneOffsetInSeconds: offset,
            });

            if (res.success) {
                login(res.data);
                navigate("/chat", { replace: true });
            } else {
                setError(res.error || "Invalid code");
                setOtp(["", "", "", "", "", ""]);
                otpRefs.current[0]?.focus();
            }
        } catch {
            setError("Verification failed. Try again.");
        }
        setLoading(false);
    };

    const handleOtpChange = (index, value) => {
        if (value.length > 1) {
            // Paste handling
            const digits = value.replace(/\D/g, "").slice(0, 6).split("");
            const next = [...otp];
            digits.forEach((d, i) => {
                if (index + i < 6) next[index + i] = d;
            });
            setOtp(next);
            const focusIdx = Math.min(index + digits.length, 5);
            otpRefs.current[focusIdx]?.focus();
            if (next.every((d) => d !== "")) handleVerify(next);
            return;
        }

        const digit = value.replace(/\D/g, "");
        const next = [...otp];
        next[index] = digit;
        setOtp(next);

        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        if (next.every((d) => d !== "")) handleVerify(next);
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-10 text-center">
                    <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
                        A1
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Your personal AI assistant
                    </p>
                </div>

                {step === "phone" && (
                    <form onSubmit={handleSendOTP}>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Phone number
                        </label>
                        <input
                            type="tel"
                            className="input-base mb-4"
                            placeholder="+91 98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoFocus
                        />

                        {error && (
                            <p className="mb-4 text-sm text-red-500">{error}</p>
                        )}

                        <button
                            type="submit"
                            className="btn-brand w-full"
                            disabled={loading || phone.trim().length < 8}
                        >
                            {loading ? (
                                <i className="ri-loader-4-line animate-spin mr-2" />
                            ) : null}
                            Send verification code
                        </button>
                    </form>
                )}

                {step === "otp" && (
                    <div>
                        <p className="mb-1 text-sm text-gray-600">
                            Enter the 6-digit code sent to
                        </p>
                        <p className="mb-6 text-sm font-medium text-gray-900">
                            {phone}
                        </p>

                        <div className="mb-4 flex justify-between gap-2">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={(el) => (otpRefs.current[i] = el)}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="h-12 w-12 rounded-lg border border-gray-200 text-center text-lg font-semibold outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/30"
                                    value={digit}
                                    onChange={(e) =>
                                        handleOtpChange(i, e.target.value)
                                    }
                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                />
                            ))}
                        </div>

                        {error && (
                            <p className="mb-4 text-sm text-red-500">{error}</p>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center py-2 text-sm text-gray-500">
                                <i className="ri-loader-4-line animate-spin mr-2" />
                                Verifying...
                            </div>
                        )}

                        <button
                            className="btn-ghost mt-2 w-full text-brand"
                            onClick={() => {
                                setStep("phone");
                                setOtp(["", "", "", "", "", ""]);
                                setError("");
                            }}
                        >
                            <i className="ri-arrow-left-line mr-1" />
                            Change number
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
