"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PromotionPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch("/api/uploads/promotion");
      if (response.ok) {
        const data = await response.json();
        setUploadedFiles(data.files);
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
        fetchUploadedFiles();
      } else {
        toast.error("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("An error occurred while uploading files.");
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const response = await fetch(
        `/api/uploads/promotion?fileName=${fileName}`,
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
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("An error occurred while deleting the file.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Promotion Management</h3>
        <p className="text-sm text-muted-foreground pt-4">
          지원 형식: ".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm",
          ".mov", ".avi", ".mkv",
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700"
          >
            Upload Files (Images/Videos)
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <Input
              id="file-upload"
              type="file"
              multiple
              onChange={handleFileChange}
            />
            <Button onClick={handleUpload}>Upload</Button>
          </div>
        </div>
        <div>
          <h4 className="text-md font-medium">Uploaded Promotions</h4>
          <ul className="mt-2 space-y-2">
            {uploadedFiles.map((file) => (
              <li
                key={file}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <a
                  href={`/uploads/promotion/${file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file}
                </a>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(file)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
