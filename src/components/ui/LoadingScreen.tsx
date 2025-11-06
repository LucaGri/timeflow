import { Loader2 } from 'lucide-react'

export default function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Caricamento...</p>
      </div>
    </div>
  )
}
