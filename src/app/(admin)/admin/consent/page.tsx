"use client";

import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ConsentPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch("/api/uploads/consent");
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
      setFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/uploads/consent", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("File uploaded successfully.");
        setFile(null);
        fetchUploadedFiles();
      } else {
        toast.error("File upload failed.");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("An error occurred while uploading the file.");
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      const response = await fetch(`/api/uploads/consent?fileName=${fileName}`, {
        method: "DELETE",
      });

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
        <h3 className="text-lg font-medium">Consent Management</h3>
        <p className="text-sm text-muted-foreground">
          Manage user consent forms.
        </p>
      </div>
      <Separator />
      <div className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
            Upload Consent Form (PDF/Image)
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <Input id="file-upload" type="file" onChange={handleFileChange} />
            <Button onClick={handleUpload}>Upload</Button>
          </div>
        </div>
        <div>
          <h4 className="text-md font-medium">Uploaded Consent Forms</h4>
          <ul className="mt-2 space-y-2">
            {uploadedFiles.map((file) => (
              <li key={file} className="flex items-center justify-between p-2 border rounded-md">
                <a href={`/uploads/consent/${file}`} target="_blank" rel="noopener noreferrer">
                  {file}
                </a>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(file)}>
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