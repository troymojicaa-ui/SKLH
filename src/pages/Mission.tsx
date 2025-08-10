import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Mission = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <Header />

      {/* Mission Content */}
      <main className="flex-1 py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
            Our Mission
          </h1>
          <p className="text-lg text-gray-700 mb-6 leading-relaxed text-center">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
            malesuada, sapien vel viverra interdum, turpis augue tincidunt
            justo, vel egestas lacus est id metus.
          </p>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Mission of This Project
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla
                facilisi. Integer mattis nisl vitae ligula eleifend, vitae
                efficitur justo euismod. Aenean pulvinar nisl non orci
                condimentum, id suscipit orci pulvinar.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Mission of SK Loyola Heights
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                sit amet posuere sapien. Cras nec ligula nec leo posuere
                bibendum non ac tellus. Pellentesque habitant morbi tristique
                senectus et netus.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Mission;
