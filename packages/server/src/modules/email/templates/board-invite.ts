import { baseTemplate } from './base'

interface BoardInviteProps {
  inviterName: string
  boardName: string
  inviteLink: string
}

export const boardInviteTemplate = ({
  inviterName,
  boardName,
  inviteLink,
}: BoardInviteProps) => baseTemplate(`
  <h2>Board Invitation</h2>
  <p><strong>${inviterName}</strong> has invited you to join the board <strong>${boardName}</strong>.</p>
  <p>Click the button below to accept the invitation and start collaborating.</p>
  <a href="${inviteLink}" class="button">View Board</a>
`)
