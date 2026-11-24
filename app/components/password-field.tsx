"use client";

import { useEffect, useRef, useState } from "react";

export default function PasswordField({ id, creating = false }: { id: string; creating?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    confirmRef.current?.setCustomValidity(
      creating && confirmation && password !== confirmation
        ? "Passwords do not match."
        : "",
    );
  }, [creating, password, confirmation]);

  return (
    <div className="account-password">
      <label htmlFor={id}>Password</label>
      <div className="account-password-control">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          ref={passwordRef}
          value={creating ? password : undefined}
          onChange={creating ? (event) => {
            setPassword(event.target.value);
            if (confirmRef.current) confirmRef.current.setCustomValidity(
              confirmation && confirmation !== event.target.value ? "Passwords do not match." : "",
            );
          } : undefined}
          required
          minLength={creating ? 8 : undefined}
          maxLength={128}
          autoComplete={creating ? "new-password" : "current-password"}
          aria-describedby={creating ? `${id}-help` : undefined}
        />
        <button type="button" className="password-visibility" aria-controls={id}
          aria-pressed={visible} onClick={() => setVisible(value => !value)}>
          {visible ? "Hide" : "Show"} password
        </button>
      </div>
      {creating && (
        <>
          <small id={`${id}-help`}>Use 8–128 characters. Choose a password you don’t use elsewhere.</small>
          <label htmlFor={`${id}-confirm`}>Confirm password</label>
          <div className="account-password-control">
            <input
              ref={confirmRef}
              id={`${id}-confirm`}
              name="confirmPassword"
              type={visible ? "text" : "password"}
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                event.currentTarget.setCustomValidity(
                  event.target.value && event.target.value !== passwordRef.current?.value
                    ? "Passwords do not match."
                    : "",
                );
              }}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              aria-describedby={`${id}-confirm-help`}
            />
          </div>
          <small id={`${id}-confirm-help`} aria-live="polite">
            {confirmation && password !== confirmation ? "Passwords do not match." : confirmation ? "Passwords match." : "Enter the same password again to confirm."}
          </small>
        </>
      )}
    </div>
  );
}
