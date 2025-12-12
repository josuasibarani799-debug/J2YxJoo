import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Image, HelpCircle } from "lucide-react";
import { SiDiscord } from "react-icons/si";

const commands = [
  {
    command: "!image",
    description: "Send a random image",
    icon: Image,
  },
  {
    command: "!image cat",
    description: "Send a cute cat image",
    icon: Image,
  },
  {
    command: "!image dog",
    description: "Send a dog image",
    icon: Image,
  },
  {
    command: "!image nature",
    description: "Send a nature/landscape image",
    icon: Image,
  },
  {
    command: "!image random",
    description: "Send a random image from any category",
    icon: Image,
  },
  {
    command: "!help",
    description: "Show all available commands",
    icon: HelpCircle,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-md bg-[#5865F2]">
            <SiDiscord className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-title">Discord Image Bot</h1>
            <p className="text-muted-foreground">Send images in your Discord server with simple commands</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Badge variant="default" className="bg-green-600 text-white">
            Bot Active
          </Badge>
          <span className="text-sm text-muted-foreground">The bot is running and listening for commands</span>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Available Commands
            </CardTitle>
            <CardDescription>
              Use these commands in any Discord channel where the bot is present
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commands.map((cmd) => (
                <div
                  key={cmd.command}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`command-${cmd.command.replace(/\s+/g, '-').replace('!', '')}`}
                >
                  <cmd.icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <code className="font-mono text-sm bg-background px-2 py-1 rounded border">
                      {cmd.command}
                    </code>
                  </div>
                  <span className="text-sm text-muted-foreground">{cmd.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                1
              </div>
              <p className="text-muted-foreground">
                Make sure the bot is added to your Discord server
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                2
              </div>
              <p className="text-muted-foreground">
                Go to any text channel where the bot has permission to read and send messages
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                3
              </div>
              <p className="text-muted-foreground">
                Type a command like <code className="font-mono bg-muted px-1 rounded">!image cat</code> and press Enter
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                4
              </div>
              <p className="text-muted-foreground">
                The bot will reply with a random image from the selected category
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
