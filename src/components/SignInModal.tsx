import { Modal } from "./Modal";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SignInModal({ open, onClose }: SignInModalProps) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="sign-in-title">
      <h2 id="sign-in-title" className="text-lg font-semibold tracking-tight">
        Sign in
      </h2>
      <p className="mt-1 text-sm text-muted">
        Browse and bid on the leaderboard. This preview doesn’t require an account.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Email</span>
          <input className="input" type="email" placeholder="you@company.com" />
        </label>
        <button type="submit" className="btn-primary mt-2 w-full">
          Continue
        </button>
      </form>
    </Modal>
  );
}
