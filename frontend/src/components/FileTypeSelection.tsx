import { useParams } from "react-router-dom";

export default function FileTypeSelection() {
  const { project_id } = useParams();

  return (
    <section className="mt-4">
      <h2>File Details for Project ID: {project_id}</h2>
      <div>
        <div className="flex items-center justify-center gap-20 h-screen">
          <div>
            <a href={`/admin/documents/${project_id}/ongoing`}>
              <img
                src="../../public/file-explorer.png"
                alt=""
                width={200}
                height={200}
              />
              <h3 className="text-center text-xl font-medium text-neutral-700">
                Ongoing Files
              </h3>
            </a>
          </div>
          <div>
            <a href={`/admin/documents/${project_id}/incomming`}>
              <img
                src="../../public/file-explorer.png"
                alt=""
                width={200}
                height={200}
              />
              <h3 className="text-center text-xl font-medium text-neutral-700">
                Incomming Files
              </h3>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
