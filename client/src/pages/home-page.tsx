import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Message, insertMessageSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { LogOut, Send, Circle, Search, Moon, Sun, Trash2 } from "lucide-react";
import { debounce } from "lodash";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const { toast } = useToast();

  useEffect(() => {
    apiRequest("POST", "/api/online");
    return () => {
      apiRequest("POST", "/api/offline");
    };
  }, []);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users", searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/users/search?q=${encodeURIComponent(searchQuery)}`
        : "/api/users";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const debouncedSearch = debounce((value: string) => {
    setSearchQuery(value);
  }, 300);

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user");
    },
    onSuccess: () => {
      logoutMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* Sidebar */}
      <div className="w-full md:w-80 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>{user?.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{user?.username}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                  deleteAccountMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search users..."
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={cn(
                "w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors",
                selectedUser?.id === u.id && "bg-accent"
              )}
            >
              <Avatar>
                <AvatarFallback>{u.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="font-medium">{u.username}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  {u.isOnline ? (
                    <>
                      <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                      <span>Online</span>
                    </>
                  ) : (
                    "Offline"
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <ChatArea selectedUser={selectedUser} currentUser={user!} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

function ChatArea({ selectedUser, currentUser }: { selectedUser: User; currentUser: User }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedUser.id],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${selectedUser.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000,
  });

  const form = useForm({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: {
      recipientId: selectedUser.id,
      content: "",
    },
  });

  const messageMutation = useMutation({
    mutationFn: async (data: { recipientId: string; content: string }) => {
      const res = await apiRequest("POST", "/api/messages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedUser.id] });
      form.reset();
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
      <div className="p-4 border-b">
        <div className="font-semibold">{selectedUser.username}</div>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          {selectedUser.isOnline ? (
            <>
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              <span>Online</span>
            </>
          ) : (
            "Offline"
          )}
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.senderId === currentUser.id ? "justify-end" : "justify-start"
              )}
            >
              <Card
                className={cn(
                  "max-w-[70%] p-3",
                  message.senderId === currentUser.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent"
                )}
              >
                {message.content}
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => messageMutation.mutate(data))}
            className="flex gap-2"
          >
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Type a message..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" size="icon" disabled={messageMutation.isPending}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
}