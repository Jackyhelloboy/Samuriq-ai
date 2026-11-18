"use client";

import { useState } from "react";

export default function PasswordField({ id, creating = false }: { id: string; creating?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="account-password">
      <label htmlFor={id}>Password</label>
      <div className="account-password-control">
        <input id={id} name="password" type={visible ? "text" : "password"}
          required minLength={creating ? 8 : undefined} maxLength={128}
          autoComplete={creating ? "new-password" : "current-password"}
          aria-describedby={creating ? `${id}-help` : undefined} />
        <button type="button" className="password-visibility" aria-controls={id}
          aria-pressed={visible} onClick={() => setVisible(value => !value)}>
          {visible ? "Hide" : "Show"} password
        </button>
      </div>
      {creating && <small id={`${id}-help`}>Use 8–128 characters. Choose a password you don’t use elsewhere.</small>}
    </div>
  );
}
