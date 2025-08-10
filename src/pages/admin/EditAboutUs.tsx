import { useState } from "react";
import { aboutUsMock } from "@/data/aboutUsMock";

const EditAboutUs = () => {
  const [missionText, setMissionText] = useState(aboutUsMock.missionText);
  const [whyWeMadeText, setWhyWeMadeText] = useState(aboutUsMock.whyWeMadeText);
  const [team, setTeam] = useState(aboutUsMock.teamMembers);

  const handleTeamChange = (index: number, field: "name" | "role" | "bio", value: string) => {
    const updated = [...team];
    updated[index][field] = value;
    setTeam(updated);
  };

  const handleSave = () => {
    console.log({
      missionText,
      whyWeMadeText,
      team,
    });
    alert("Changes saved (mock only). Connect this to your backend later.");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold">Edit About Us</h1>

      <div>
        <label className="block mb-1 font-medium">Mission Statement</label>
        <textarea
          value={missionText}
          onChange={(e) => setMissionText(e.target.value)}
          className="w-full border p-2 rounded"
          rows={4}
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Why We Made This Project</label>
        <textarea
          value={whyWeMadeText}
          onChange={(e) => setWhyWeMadeText(e.target.value)}
          className="w-full border p-2 rounded"
          rows={4}
        />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mt-6 mb-4">Team Members</h2>
        {team.map((member, index) => (
          <div key={index} className="mb-6 p-4 border rounded shadow-sm">
            <label className="block mb-1 font-medium">Name</label>
            <input
              type="text"
              className="w-full border p-2 rounded mb-2"
              value={member.name}
              onChange={(e) => handleTeamChange(index, "name", e.target.value)}
            />
            <label className="block mb-1 font-medium">Role</label>
            <input
              type="text"
              className="w-full border p-2 rounded mb-2"
              value={member.role}
              onChange={(e) => handleTeamChange(index, "role", e.target.value)}
            />
            <label className="block mb-1 font-medium">Bio</label>
            <textarea
              className="w-full border p-2 rounded"
              value={member.bio}
              onChange={(e) => handleTeamChange(index, "bio", e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Save Changes
      </button>
    </div>
  );
};

export default EditAboutUs;
