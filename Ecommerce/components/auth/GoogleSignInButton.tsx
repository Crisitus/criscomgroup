"use client"

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"

type Props = {
  onCredential: (credential: string) => Promise<void>
  disabled?: boolean
}

function GoogleButton({ onCredential, disabled = false }: Props) {
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <GoogleLogin
        onSuccess={(result) => {
          if (result.credential) void onCredential(result.credential)
        }}
        onError={() => undefined}
        theme="outline"
        size="large"
        shape="rectangular"
        text="continue_with"
        width="352"
        locale="es"
      />
    </div>
  )
}

export default function GoogleSignInButton(props: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  if (!clientId) return null

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleButton {...props} />
    </GoogleOAuthProvider>
  )
}
