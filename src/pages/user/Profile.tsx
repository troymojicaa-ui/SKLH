import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const UserProfile = () => {
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [address, setAddress] = useState("");

  // Simulate fetching existing user data on mount
  // Replace with API call to load data
  // useEffect(() => { ... }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!bio || !birthday || !address) {
      alert("Please fill in all required fields.");
      return;
    }
    // Save profile data to backend here
    console.log({
      profilePic,
      bio,
      birthday,
      address,
    });
    alert("Profile saved successfully!");
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>

      {/* Profile Picture Upload */}
      <div className="mb-6">
        <Label>Profile Picture (optional)</Label>
        <div className="flex items-center mt-2">
          <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
            {profilePic ? (
              <img
                src={profilePic}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No image
              </div>
            )}
          </div>
          <Input
            type="file"
            accept="image/*"
            className="ml-4"
            onChange={handleImageChange}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="mb-4">
        <Label htmlFor="bio">Bio *</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          required
        />
      </div>

      {/* Birthday */}
      <div className="mb-4">
        <Label htmlFor="birthday">Birthday *</Label>
        <Input
          id="birthday"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          required
        />
      </div>

      {/* Address */}
      <div className="mb-4">
        <Label htmlFor="address">Address *</Label>
        <Input
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Your address"
          required
        />
      </div>

      <Button className="mt-4 w-full" onClick={handleSave}>
        Save Profile
      </Button>
    </div>
  );
};

export default UserProfile;
