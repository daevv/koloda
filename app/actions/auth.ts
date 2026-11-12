"use server";

import { redirect } from "next/navigation";
import { isNextInterrupt, publicErrorMessage } from "@/lib/action-error";
import { createUser, findUserByEmail, userHasBoards } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import type { AuthFormState, AuthMode } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function validate(mode: AuthMode, formData: FormData) {
  const fields: NonNullable<AuthFormState["fields"]> = {};
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const name = text(formData, "name").trim().replace(/\s+/g, " ");

  if (mode === "register") {
    if (name.length < 2) fields.name = "Имя — хотя бы 2 символа.";
    if (name.length > 40) fields.name = "Имя короче 40 символов.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fields.email = "Нужна настоящая почта.";
  }
  if (password.length < 8 || password.length > 72) {
    fields.password = "Пароль от 8 до 72 символов.";
  } else if (!/[\p{L}]/u.test(password) || !/\d/.test(password)) {
    fields.password = "Добавь хотя бы одну букву и одну цифру.";
  }

  return { fields, email, password, name };
}

export async function authenticate(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const mode: AuthMode = formData.get("mode") === "register" ? "register" : "login";
  const { fields, email, password, name } = validate(mode, formData);
  if (Object.keys(fields).length > 0) return { mode, fields };

  try {
    if (mode === "register") {
      const user = await createUser({
        email,
        name,
        passwordHash: await hashPassword(password),
      });
      if (!user) {
        return { mode, fields: { email: "Такая почта уже зарегистрирована." } };
      }
      await createSession(user.id);
      redirect("/boards");
    }

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { mode, error: "Неверная почта или пароль." };
    }
    await createSession(user.id);
    redirect((await userHasBoards(user.id)) ? "/deck" : "/boards");
  } catch (error) {
    if (isNextInterrupt(error)) throw error;
    console.error(error);
    return { mode, error: publicErrorMessage(error) };
  }
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
