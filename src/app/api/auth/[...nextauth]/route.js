import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@eval.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                try {
                    const { data: user, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', credentials.email)
                        .maybeSingle(); // maybeSingle deals gracefully with 0 rows

                    if (error || !user) {
                        throw new Error("No user found with the given email.");
                    }

                    const isValid = await bcrypt.compare(credentials.password, user.password);
                    if (!isValid) {
                        throw new Error("Invalid password.");
                    }

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        roles: user.roles || [user.role],
                        address: user.address,
                        phone: user.phone,
                        account_name: user.account_name,
                        bank_name: user.bank_name,
                        account_no: user.account_no,
                        branch: user.branch
                    };
                } catch (error) {
                    console.error("Auth error:", error);
                    throw error;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.roles = user.roles;
                token.id = user.id;
                token.address = user.address;
                token.phone = user.phone;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.roles = token.roles;
                session.user.id = token.id;
                session.user.address = token.address;
                session.user.phone = token.phone;

                // Compatibility with old role check
                // Prefer 'admin' if present, otherwise first role, default to 'lecturer'
                if (token.roles?.includes('admin')) {
                    session.user.role = 'admin';
                } else {
                    session.user.role = token.roles?.[0] || 'lecturer';
                }
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET || "SUPER_SECRET_KEY_FOR_DEV_ONLY",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
