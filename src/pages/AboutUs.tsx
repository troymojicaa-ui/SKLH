import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { aboutUsMock } from "@/data/aboutUsMock";

const About = () => {
  return (
    <div className="bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section
        className="relative h-[700px] bg-cover bg-center"
        style={{ backgroundImage: `url(${aboutUsMock.heroImage})` }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white">
          <h1 className="text-5xl font-bold drop-shadow-md"></h1>
          <p className="mt-4 text-lg drop-shadow-md max-w-2xl"></p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-20">
        {/* Why We Made This Project */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Why We Made This Project</h2>
            <p className="text-gray-600 leading-relaxed">{aboutUsMock.whyWeMadeText}</p>
          </div>
          <div>
            <img
              src={aboutUsMock.whyWeMadeThisImage}
              alt="Why We Made This Project"
              className="rounded-lg shadow-lg w-full"
            />
          </div>
        </div>

        {/* Our Mission */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <img
              src={aboutUsMock.ourMissionImage}
              alt="Our Mission"
              className="rounded-lg shadow-lg w-full"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">{aboutUsMock.missionText}</p>
          </div>
        </div>

        {/* Meet Our Team */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-10">Meet Our Team</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {aboutUsMock.teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
              >
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-56 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold">{member.name}</h3>
                  <p className="text-blue-600 font-medium">{member.role}</p>
                  <p className="mt-4 text-gray-600 text-sm">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default About;
