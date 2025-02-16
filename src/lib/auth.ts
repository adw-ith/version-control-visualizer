import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

interface JWTCallbackParams {
  token: any;
  account?: any;
  user?: any;
  profile?: any;
}

interface SessionCallbackParams {
  session: any;
  token: any;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }: JWTCallbackParams) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }: SessionCallbackParams) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
};

export default NextAuth(authOptions);
