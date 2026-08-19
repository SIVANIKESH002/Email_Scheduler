import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: AuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Credentials provider fallback strictly gated behind DEV_MODE=true
    ...(process.env.DEV_MODE === 'true'
      ? [
          CredentialsProvider({
            name: 'Demo Admin Account',
            credentials: {
              email: { label: 'Email', type: 'email', value: 'admin@reachinbox.com' },
              password: { label: 'Password', type: 'password', value: 'admin123' },
            },
            async authorize(credentials) {
              if (credentials?.email === 'admin@reachinbox.com' && credentials?.password === 'admin123') {
                return {
                  id: 'usr_demo_1',
                  name: 'ReachInbox Admin',
                  email: 'admin@reachinbox.com',
                  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
                };
              }
              return null;
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'supersecret_nextauth_reachinbox_key',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
