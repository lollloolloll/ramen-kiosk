"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { FileVideo, Link as LinkIcon, FileUp } from "lucide-react";

interface UploadedItem {
  type: "file" | "url";
  name: string;
  url?: string;
}

export default function PromotionPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedItems, setUploadedItems] = useState<UploadedItem[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch("/api/uploads/promotion");
      if (response.ok) {
        const data = await response.json();
        // files는 파일명 배열, urls는 URL 객체 배열
        const fileItems: UploadedItem[] = (data.files || []).map(
          (file: string) => ({
            type: "file" as const,
            name: file,
          })
        );
        const urlItems: UploadedItem[] = data.urls || [];
        setUploadedItems([...fileItems, ...urlItems]);
      }
    } catch (error) {
      console.error("Error fetching uploaded files:", error);
    }
  };

  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/uploads/promotion", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Files uploaded successfully.");
        setFiles([]);
        // input 초기화
        const fileInput = document.getElementById(
          "file-upload"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        fetchUploadedFiles();
      } else {
        const data = await response.json();
        toast.error(data.error || "File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("An error occurred while uploading files.");
    }
  };

  const handleAddUrl = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL.");
      return;
    }

    // URL 유효성 검사 (간단)
    try {
      new URL(videoUrl);
    } catch {
      toast.error("Please enter a valid URL.");
      return;
    }

    const title = urlTitle.trim() || videoUrl;

    try {
      const response = await fetch("/api/uploads/promotion/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: videoUrl, title }),
      });

      if (response.ok) {
        toast.success("Video URL added successfully.");
        setVideoUrl("");
        setUrlTitle("");
        fetchUploadedFiles();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to add URL.");
      }
    } catch (error) {
      console.error("Error adding URL:", error);
      toast.error("An error occurred while adding the URL.");
    }
  };

  const handleDelete = async (item: UploadedItem) => {
    try {
      if (item.type === "file") {
        const response = await fetch(
          `/api/uploads/promotion?fileName=${item.name}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          toast.success("File deleted successfully.");
          fetchUploadedFiles();
        } else {
          toast.error("File deletion failed.");
        }
      } else {
        // URL 삭제
        const response = await fetch(
          `/api/uploads/promotion/url?title=${encodeURIComponent(item.name)}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          toast.success("URL deleted successfully.");
          fetchUploadedFiles();
        } else {
          toast.error("URL deletion failed.");
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("An error occurred while deleting.");
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext || "")) {
      return "🎥";
    } else if (ext === "pdf") {
      return "📄";
    } else {
      return "🖼️";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Promotion Management</h3>
        <p className="text-sm text-muted-foreground pt-4">
          파일 업로드 또는 동영상 URL을 추가하여 프로모션을 관리하세요.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <FileUp className="w-4 h-4" />
            파일 업로드
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            URL 추가
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4 mt-4">
          <div>
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Upload Files (Images/Videos/PDFs)
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              지원 형식: JPG, PNG, WebP, GIF, PDF, MP4, WebM, MOV, AVI, MKV
            </p>
            <div className="flex items-center space-x-2">
              <Input
                id="file-upload"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.mp4,.webm,.mov,.avi,.mkv"
                onChange={handleFileChange}
              />
              <Button onClick={handleUpload} disabled={files.length === 0}>
                <FileUp className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {files.length}개 파일 선택됨
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="video-url" className="text-sm font-medium">
                Video URL
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                YouTube, Vimeo 등 외부 동영상 URL을 추가하세요
              </p>
              <Input
                id="video-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="url-title" className="text-sm font-medium">
                Title (Optional)
              </Label>
              <Input
                id="url-title"
                type="text"
                placeholder="프로모션 제목"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
              />
            </div>
            <Button onClick={handleAddUrl} disabled={!videoUrl.trim()}>
              <FileVideo className="w-4 h-4 mr-2" />
              Add URL
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div>
        <h4 className="text-md font-medium mb-3">Uploaded Promotions</h4>
        {uploadedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            업로드된 프로모션이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {uploadedItems.map((item, index) => (
              <li
                key={`${item.type}-${index}`}
                className="flex items-center justify-between p-3 border rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">
                    {item.type === "url" ? "🔗" : getFileIcon(item.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {item.type === "file" ? (
                      <a
                        href={`/uploads/promotion/${item.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline truncate block text-blue-600"
                      >
                        {item.name}
                      </a>
                    ) : (
                      <div>
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline truncate block"
                        >
                          {item.url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(item)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
