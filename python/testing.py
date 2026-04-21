import tkinter as tk
from tkinter import messagebox
from game import TeekoPlayer

CELL = 90
PAD = 40
COLORS = {'b': '#2255cc', 'r': '#cc2222', ' ': '#e8d5a3'}
HIGHLIGHT = '#ffe066'
SELECT_COLOR = '#44cc44'

class TeekoGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Teeko")
        self.ai = TeekoPlayer()
        self.selected = None   # (row, col) of piece selected to move
        self.turn = 0          # 0 = pieces[0]='b', 1 = pieces[1]='r'
        self.game_over = False

        size = CELL * 5 + PAD * 2
        self.canvas = tk.Canvas(root, width=size, height=size, bg='#8B6914')
        self.canvas.pack(padx=10, pady=10)
        self.canvas.bind("<Button-1>", self.on_click)

        self.status = tk.Label(root, font=('Arial', 14), pady=6)
        self.status.pack()

        restart_btn = tk.Button(root, text="Restart", font=('Arial', 12), command=self.restart)
        restart_btn.pack(pady=(0, 10))

        self.draw_board()
        self.update_status()

        # If AI goes first, let it move immediately
        if self.ai.my_piece == self.ai.pieces[self.turn]:
            self.root.after(300, self.ai_move)

    def piece_count(self):
        return sum(cell != ' ' for row in self.ai.board for cell in row)

    def drop_phase(self):
        return self.piece_count() < 8

    def current_piece(self):
        return self.ai.pieces[self.turn]

    def is_human_turn(self):
        return self.current_piece() == self.ai.opp

    def draw_board(self):
        self.canvas.delete("all")
        # grid cells
        for i in range(5):
            for j in range(5):
                x0 = PAD + j * CELL
                y0 = PAD + i * CELL
                x1 = x0 + CELL
                y1 = y0 + CELL
                self.canvas.create_rectangle(x0, y0, x1, y1, fill='#c8a96e', outline='#5a3e1b', width=2)

        # highlight selected cell
        if self.selected:
            si, sj = self.selected
            x0 = PAD + sj * CELL
            y0 = PAD + si * CELL
            self.canvas.create_rectangle(x0, y0, x0+CELL, y0+CELL,
                                         fill=SELECT_COLOR, outline='#5a3e1b', width=2)
            # highlight valid destinations
            for di in [-1, 0, 1]:
                for dj in [-1, 0, 1]:
                    if di == 0 and dj == 0:
                        continue
                    ni, nj = si + di, sj + dj
                    if 0 <= ni < 5 and 0 <= nj < 5 and self.ai.board[ni][nj] == ' ':
                        x0h = PAD + nj * CELL
                        y0h = PAD + ni * CELL
                        self.canvas.create_rectangle(x0h, y0h, x0h+CELL, y0h+CELL,
                                                     fill=HIGHLIGHT, outline='#5a3e1b', width=2)

        # pieces
        r = CELL // 2 - 8
        for i in range(5):
            for j in range(5):
                piece = self.ai.board[i][j]
                if piece != ' ':
                    cx = PAD + j * CELL + CELL // 2
                    cy = PAD + i * CELL + CELL // 2
                    color = COLORS[piece]
                    self.canvas.create_oval(cx-r, cy-r, cx+r, cy+r,
                                            fill=color, outline='#111', width=2)
                    self.canvas.create_text(cx, cy, text=piece.upper(),
                                            font=('Arial', 18, 'bold'), fill='white')

        # row/col labels
        cols = 'ABCDE'
        for j in range(5):
            cx = PAD + j * CELL + CELL // 2
            self.canvas.create_text(cx, PAD // 2, text=cols[j],
                                    font=('Arial', 12, 'bold'), fill='white')
        for i in range(5):
            cy = PAD + i * CELL + CELL // 2
            self.canvas.create_text(PAD // 2, cy, text=str(i),
                                    font=('Arial', 12, 'bold'), fill='white')

    def update_status(self):
        if self.game_over:
            return
        piece = self.current_piece()
        who = "Your" if self.is_human_turn() else "AI's"
        phase = "Drop phase" if self.drop_phase() else "Move phase"
        color_name = "Blue" if piece == 'b' else "Red"
        self.status.config(text=f"{who} turn ({color_name}) — {phase}")

    def on_click(self, event):
        if self.game_over or not self.is_human_turn():
            return
        col = (event.x - PAD) // CELL
        row = (event.y - PAD) // CELL
        if not (0 <= row < 5 and 0 <= col < 5):
            return

        if self.drop_phase():
            if self.ai.board[row][col] != ' ':
                return
            move = [(row, col)]
            try:
                self.ai.opponent_move(move)
            except Exception as e:
                messagebox.showwarning("Invalid move", str(e))
                return
            self.after_human_move()
        else:
            if self.selected is None:
                if self.ai.board[row][col] == self.ai.opp:
                    self.selected = (row, col)
                    self.draw_board()
            else:
                sr, sc = self.selected
                if (row, col) == self.selected:
                    self.selected = None
                    self.draw_board()
                    return
                move = [(row, col), (sr, sc)]
                try:
                    self.ai.opponent_move(move)
                    self.selected = None
                    self.after_human_move()
                except Exception as e:
                    if self.ai.board[row][col] == self.ai.opp:
                        self.selected = (row, col)
                        self.draw_board()
                    else:
                        messagebox.showwarning("Invalid move", str(e))
                        self.selected = None
                        self.draw_board()

    def after_human_move(self):
        self.draw_board()
        if self.check_game_over():
            return
        self.turn = (self.turn + 1) % 2
        self.update_status()
        self.root.after(300, self.ai_move)

    def ai_move(self):
        if self.game_over:
            return
        move = self.ai.make_move(self.ai.board)
        self.ai.place_piece(move, self.ai.my_piece)
        self.draw_board()
        if self.check_game_over():
            return
        self.turn = (self.turn + 1) % 2
        self.update_status()

    def check_game_over(self):
        val = self.ai.game_value(self.ai.board)
        if val == 1:
            self.game_over = True
            self.status.config(text="AI wins! Game over.")
            messagebox.showinfo("Game Over", "AI wins!")
            return True
        elif val == -1:
            self.game_over = True
            self.status.config(text="You win! Game over.")
            messagebox.showinfo("Game Over", "You win!")
            return True
        return False

    def restart(self):
        self.ai = TeekoPlayer()
        self.selected = None
        self.turn = 0
        self.game_over = False
        self.draw_board()
        self.update_status()
        if self.ai.my_piece == self.ai.pieces[self.turn]:
            self.root.after(300, self.ai_move)


if __name__ == "__main__":
    root = tk.Tk()
    app = TeekoGUI(root)
    root.mainloop()
