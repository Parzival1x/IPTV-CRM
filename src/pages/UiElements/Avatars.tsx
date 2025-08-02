import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Avatar from "../../components/ui/avatar/Avatar";
import PageMeta from "../../components/common/PageMeta";

export default function Avatars() {
  return (
    <>
      <PageMeta
        title="React.js Avatars Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Avatars Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <PageBreadcrumb pageTitle="Avatars" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Default Avatar">
          {/* Default Avatar (No Status) */}
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar name="John Doe" size="xsmall" />
            <Avatar name="Jane Smith" size="small" />
            <Avatar name="Bob Johnson" size="medium" />
            <Avatar name="Alice Brown" size="large" />
            <Avatar name="Charlie Davis" size="xlarge" />
            <Avatar name="Diana Wilson" size="xxlarge" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with online indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar name="John Doe" size="xsmall" status="online" />
            <Avatar name="Jane Smith" size="small" status="online" />
            <Avatar name="Bob Johnson" size="medium" status="online" />
            <Avatar name="Alice Brown" size="large" status="online" />
            <Avatar name="Charlie Davis" size="xlarge" status="online" />
            <Avatar name="Diana Wilson" size="xxlarge" status="online" />
          </div>
        </ComponentCard>
        <ComponentCard title="Avatar with Offline indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar name="John Doe" size="xsmall" status="offline" />
            <Avatar name="Jane Smith" size="small" status="offline" />
            <Avatar name="Bob Johnson" size="medium" status="offline" />
            <Avatar name="Alice Brown" size="large" status="offline" />
            <Avatar name="Charlie Davis" size="xlarge" status="offline" />
            <Avatar name="Diana Wilson" size="xxlarge" status="offline" />
          </div>
        </ComponentCard>{" "}
        <ComponentCard title="Avatar with busy indicator">
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <Avatar name="John Doe" size="xsmall" status="busy" />
            <Avatar name="Jane Smith" size="small" status="busy" />
            <Avatar name="Bob Johnson" size="medium" status="busy" />
            <Avatar name="Alice Brown" size="large" status="busy" />
            <Avatar name="Charlie Davis" size="xlarge" status="busy" />
            <Avatar name="Diana Wilson" size="xxlarge" status="busy" />
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
