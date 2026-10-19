import { describe, expect, it, beforeEach } from "vitest";
import { loginUser, logoutUser, verifyCredentials } from "@/lib/auth";
import { updateSettings } from "@/lib/store";

describe("Configured admin credentials authentication", () => {
  beforeEach(() => {
    logoutUser();
  });

  it("validates default credentials blaisechristeveste@gmail.com and #Christ21", () => {
    expect(verifyCredentials("blaisechristeveste@gmail.com", "#Christ21")).toBe(true);
    expect(verifyCredentials("BLAISECHRISTEVESTE@GMAIL.COM", "#Christ21")).toBe(true);
    expect(verifyCredentials("blaisechristeveste@gmail.com", "wrongpass")).toBe(false);
    expect(verifyCredentials("other@gmail.com", "#Christ21")).toBe(false);
  });

  it("logs in with configured admin credentials", () => {
    const session = loginUser("blaisechristeveste@gmail.com", "#Christ21");
    expect(session.isLoggedIn).toBe(true);
    expect(session.email).toBe("blaisechristeveste@gmail.com");
  });

  it("rejects invalid credentials with an error", () => {
    expect(() => loginUser("blaisechristeveste@gmail.com", "bad")).toThrow("Email ou mot de passe incorrect.");
  });

  it("allows modifying credentials in admin settings", () => {
    updateSettings({
      security: {
        adminEmail: "newadmin@primeshipping.com",
        adminPassword: "NewSecretPassword2026",
      },
    });

    expect(verifyCredentials("newadmin@primeshipping.com", "NewSecretPassword2026")).toBe(true);
    const session = loginUser("newadmin@primeshipping.com", "NewSecretPassword2026");
    expect(session.isLoggedIn).toBe(true);

    // Reset back to user's requested defaults
    updateSettings({
      security: {
        adminEmail: "blaisechristeveste@gmail.com",
        adminPassword: "#Christ21",
      },
    });
  });
});
