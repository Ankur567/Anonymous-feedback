"use client";

import FeedbackCard from "@/components/FeedbackCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Feedback } from "@/model/Feedback";
import { User } from "@/model/User";
import { acceptFeedbackSchema } from "@/schemas/acceptFeedbackSchema";
import { ApiResponse } from "@/types/apiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2, RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

const Page = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);

  const { toast } = useToast();

  const handleDeleteFeedback = (feedbackId: string) => {
    setFeedbacks(feedbacks.filter((feedback) => feedback._id != feedbackId));
  };

  const { data: session, status } = useSession();

  const form = useForm({
    resolver: zodResolver(acceptFeedbackSchema),
  });

  const { register, watch, setValue } = form;
  const acceptfeedbacks = watch("acceptfeedbacks");

  const fetchAcceptfeedbacks = useCallback(async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.get<ApiResponse>("/api/accept-feedbacks");
      setValue("acceptfeedbacks", response.data.isAcceptingFeedback);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.feedback ??
          "Failed to fetch feedback settings",
        variant: "destructive",
      });
    } finally {
      setIsSwitchLoading(false);
    }
  }, [setValue]);

  const fetchfeedbacks = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      try {
        const response = await axios.get<ApiResponse>("/api/get-feedbacks");
        setFeedbacks(
          Array.isArray(response.data.feedback) ? response.data.feedback : []
        );
        if (refresh) {
          toast({
            title: "Refreshed feedbacks",
            description: "Showing latest feedbacks",
          });
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: "Error",
          description:
            axiosError.response?.data.feedback ?? "Failed to fetch feedbacks",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setFeedbacks]
  );

  // Fetch initial state from the server
  useEffect(() => {
    if (!session || !session.user) return;
    fetchfeedbacks();
    fetchAcceptfeedbacks();
  }, [session]);

  // Handle switch change
  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>("/api/accept-feedbacks", {
        acceptfeedbacks: !acceptfeedbacks,
      });
      setValue("acceptfeedbacks", !acceptfeedbacks);
      toast({
        title: response.data.feedback,
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.feedback ??
          "Failed to update feedback settings",
        variant: "destructive",
      });
    }
  };

  const user = session?.user as User;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""; // dynamically get base URL
  const profileUrl = `${baseUrl}/u/${user?.username || ""}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      alert("Profile URL copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      alert("Failed to copy URL");
    }
  };

  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/sign-in") {
      router.replace("/sign-in");
    }
  }, [status, pathname]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-20 w-20 animate-spin" />
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="flex items-center justify-center text-3xl font-bold">
        Please Login
      </div>
    );
  }

  return (
    <div className="my-8 mx-4 md:mx-8 lg:mx-auto p-6 bg-white rounded w-full max-w-6xl">
      <h1 className="text-4xl font-bold mb-4">Bonjour {user?.username}</h1>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Copy Your Unique Link</h2>{" "}
        <div className="flex items-center">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="input input-bordered w-full p-2 mr-2"
          />
          <Button onClick={copyToClipboard} className="">
            Copy
          </Button>
        </div>
      </div>
      <div className="mb-4">
        <Switch
          {...register("acceptfeedbacks")}
          checked={acceptfeedbacks}
          onCheckedChange={handleSwitchChange}
          disabled={isSwitchLoading}
        />
        <span className="ml-2">
          Accept feedbacks: {acceptfeedbacks ? "On" : "Off"}
        </span>
      </div>
      <Separator />

      <Button
        className="mt-4"
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          fetchfeedbacks(true);
        }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
      </Button>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {feedbacks.length > 0 ? (
          feedbacks.map((feedback, index) => (
            <FeedbackCard
              key={index} // Use index only if _id is not present
              feedback={feedback}
              onFeedbackDelete={handleDeleteFeedback}
            />
          ))
        ) : (
          <p>No feedbacks to display.</p>
        )}
      </div>
    </div>
  );
};

export default Page;
