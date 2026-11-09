"use client";

import { createAuthClient } from "better-auth/react";

/** Client d'authentification (même origine que l'application). */
export const authClient = createAuthClient();
