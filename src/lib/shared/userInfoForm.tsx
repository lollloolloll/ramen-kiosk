"use client";

import { useState, useEffect } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getGeneralUserById } from "@/lib/actions/generalUser";
import { getRentalRecordPeople } from "@/lib/actions/rental";
import { generalUsers, rentalRecordPeople } from "@drizzle/schema";
import { Separator } from "@/components/ui/separator";

type GeneralUser = typeof generalUsers.$inferSelect;
type RentalRecordPerson = typeof rentalRecordPeople.$inferSelect;

interface UserInfoFormProps {
  userId: number | null;
  username: string | null;
  userPhone: string | null;
  rentalRecordId: number | null;
}

export function UserInfoForm({
  userId,
  username,
  userPhone,
  rentalRecordId,
}: UserInfoFormProps) {
  const [user, setUser] = useState<GeneralUser | null>(null);
  const [participants, setParticipants] = useState<RentalRecordPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserData() {
      setLoading(true);
      if (userId) {
        const result = await getGeneralUserById(userId);
        if (result.success && result.data) {
          setUser(result.data);
          setError(null);
        } else {
          setError(result.error || "사용자 정보를 불러오는데 실패했습니다.");
          setUser(null);
        }
      } else {
        setUser(null);
        setError("사용자 ID를 찾을 수 없습니다.");
      }
      setLoading(false);
    }

    async function fetchParticipants() {
      if (rentalRecordId) {
        const result = await getRentalRecordPeople(rentalRecordId);
        if (result.success && result.data) {
          setParticipants(result.data);
        }
      }
    }

    Promise.all([fetchUserData(), fetchParticipants()]);
  }, [userId, rentalRecordId]);

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{username || "알 수 없는 사용자"}님의 상세 정보</DialogTitle>
      </DialogHeader>
      {loading ? (
        <p className="text-center py-8">로딩 중...</p>
      ) : user ? (
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              이름
            </Label>
            <Input id="name" value={user.name} readOnly className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="text-right">
              전화번호
            </Label>
            <Input
              id="phoneNumber"
              value={user.phoneNumber}
              readOnly
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">
              성별
            </Label>
            <Input
              id="gender"
              value={user.gender}
              readOnly
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="birthDate" className="text-right">
              생년월일
            </Label>
            <Input
              id="birthDate"
              value={user.birthDate || "-"}
              readOnly
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="school" className="text-right">
              학교
            </Label>
            <Input
              id="school"
              value={user.school || "-"}
              readOnly
              className="col-span-3"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 py-4">
          <p className="text-center py-4 text-muted-foreground">
            사용자 정보를 불러올 수 없습니다.
          </p>
          {username && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                이름
              </Label>
              <Input id="name" value={username} readOnly className="col-span-3" />
            </div>
          )}
          {userPhone && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                전화번호
              </Label>
              <Input
                id="phoneNumber"
                value={userPhone}
                readOnly
                className="col-span-3"
              />
            </div>
          )}
          {error && <p className="text-center text-red-500">({error})</p>}
        </div>
      )}

      {participants.length > 0 && (
        <>
          <Separator />
          <div className="py-4">
            <h4 className="mb-4 text-center font-semibold">함께 빌린 사람</h4>
            <div className="grid gap-4">
              {participants.map((person) => (
                <div
                  key={person.id}
                  className="grid grid-cols-4 items-center gap-4"
                >
                  <Label className="text-right">이름</Label>
                  <Input
                    value={person.name}
                    readOnly
                    className="col-span-2"
                  />
                  <Input
                    value={person.gender}
                    readOnly
                    className="col-span-1"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </DialogContent>
  );
}
