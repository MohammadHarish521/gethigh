import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      icon="search"
      title="Page not found"
      description="That URL doesn’t match a product or a page on BidTop."
      action={
        <Link to="/" className="btn-primary">
          Back to explore
        </Link>
      }
    />
  );
}
