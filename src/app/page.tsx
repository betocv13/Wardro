import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Card className="p-8 max-w-md text-center space-y-4 shadow-lg">
        <h1 className="text-3xl font-bold">👕 Wardro</h1>
        <p className="text-muted-foreground">
          Your closet, simplified. Track what you wear, when to wash, and keep your wardrobe organized.
        </p>
        <Button>Get Started</Button>
      </Card>
    </main>
  )
}