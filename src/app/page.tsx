import { Card } from "@/components/ui/card"

import AuthForm from "@/components/AuthForm"


export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Card className="p-8 max-w-md w-full text-center space-y-4 shadow-lg">
        <h1 className="text-3xl font-bold">Wardro</h1>
        <p className="text-muted-foreground">
          Your closet, simplified. Track what you wear, when to wash, and keep your wardrobe organized.
        </p>

        <div className="pt-4 border-t">
          <AuthForm />
        </div>
      </Card>
    </main>
  )
}