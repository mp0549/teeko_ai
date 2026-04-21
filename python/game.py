import random

class TeekoPlayer:
    """ An object representation for an AI game player for the game Teeko.
    """
    pieces = ['b', 'r']
    max_depth = 4

    def __init__(self):
        """ Initializes a TeekoPlayer object by randomly selecting red or black as its
        piece color.
        """
        self.board = [[' ' for j in range(5)] for i in range(5)]
        self.my_piece = random.choice(self.pieces)
        self.opp = self.pieces[0] if self.my_piece == self.pieces[1] else self.pieces[1]

    def make_move(self, state):
        """ 
        TODO: Selects a (row, col) space for the next move. You may assume that whenever
        this function is called, it is this player's turn to move.

        Args:
            state (list of lists): should be the current state of the game as saved in
                this TeekoPlayer object. Note that this is NOT assumed to be a copy of
                the game state and should NOT be modified within this method (use
                place_piece() instead). Any modifications (e.g. to generate successors)
                should be done on a deep copy of the state.

                In the "drop phase", the state will contain less than 8 elements which
                are not ' ' (a single space character).

        Return:
            move (list): a list of move tuples such that its format is
                    [(row, col), (source_row, source_col)]
                where the (row, col) tuple is the location to place a piece and the
                optional (source_row, source_col) tuple contains the location of the
                piece the AI plans to relocate (for moves after the drop phase). In
                the drop phase, this list should contain ONLY THE FIRST tuple.

        Note that without drop phase behavior, the AI will just keep placing new markers
            and will eventually take over the board. This is not a valid strategy and
            will earn you no points.
        """

        valid_moves = self.succ(state, self.my_piece)

        best_score = float('-inf')
        best_state = None
        for succ_state in valid_moves:
            score = self.min_value(succ_state, 1, best_score, float('inf'))
            if score > best_score:
                best_score = score
                best_state = succ_state

        # reconstruct move from diff between state and best_state
        move = []
        dest = src = None
        for i in range(5):
            for j in range(5):
                if best_state[i][j] == self.my_piece and state[i][j] != self.my_piece:
                    dest = (i, j)
                if best_state[i][j] != self.my_piece and state[i][j] == self.my_piece:
                    src = (i, j)
        move.append(dest)
        if src is not None:
            move.append(src)

        return move

    def succ(self, state, my_piece):
        """
        TODO: Generate a list of valid successors for the current game state
        on placing your piece. (defined by self.my_piece)
        """

        pieces = []
        for i in range(5):
            for j in range(5):
                if state[i][j] == my_piece:
                    pieces.append((i, j))

        piece_count = sum(row.count('b') + row.count('r') for row in state)
        drop_phase = piece_count < 8

        valid_moves = []
        nums = [-1, 0, 1]

        if drop_phase:
            for i, j in sorted(
                ((i, j) for i in range(5) for j in range(5) if state[i][j] == ' '),
                key=lambda p: abs(p[0]-2) + abs(p[1]-2)
            ):
                succ_state = [row[:] for row in state]
                succ_state[i][j] = my_piece
                valid_moves.append(succ_state)
        else:
            candidates = []
            for (pi, pj) in pieces:
                for di in nums:
                    for dj in nums:
                        if di == 0 and dj == 0:
                            continue
                        ni, nj = pi + di, pj + dj
                        if 0 <= ni < 5 and 0 <= nj < 5 and state[ni][nj] == ' ':
                            candidates.append((abs(ni-2) + abs(nj-2), pi, pj, ni, nj))
            for _, pi, pj, ni, nj in sorted(candidates):
                succ_state = [row[:] for row in state]
                succ_state[pi][pj] = ' '
                succ_state[ni][nj] = my_piece
                valid_moves.append(succ_state)

        return valid_moves
    
    def opponent_move(self, move):
        """ Validates the opponent's next move against the internal board representation.
        You don't need to touch this code.

        Args:
            move (list): a list of move tuples such that its format is
                    [(row, col), (source_row, source_col)]
                where the (row, col) tuple is the location to place a piece and the
                optional (source_row, source_col) tuple contains the location of the
                piece the AI plans to relocate (for moves after the drop phase). In
                the drop phase, this list should contain ONLY THE FIRST tuple.
        """
        # validate input
        if len(move) > 1:
            source_row = move[1][0]
            source_col = move[1][1]
            if source_row != None and self.board[source_row][source_col] != self.opp:
                self.print_board()
                print(move)
                raise Exception("You don't have a piece there!")
            if abs(source_row - move[0][0]) > 1 or abs(source_col - move[0][1]) > 1:
                self.print_board()
                print(move)
                raise Exception('Illegal move: Can only move to an adjacent space')
        if self.board[move[0][0]][move[0][1]] != ' ':
            raise Exception("Illegal move detected")
        # make move
        self.place_piece(move, self.opp)

    def place_piece(self, move, piece):
        """ Modifies the board representation using the specified move and piece

        Args:
            move (list): a list of move tuples such that its format is
                    [(row, col), (source_row, source_col)]
                where the (row, col) tuple is the location to place a piece and the
                optional (source_row, source_col) tuple contains the location of the
                piece the AI plans to relocate (for moves after the drop phase). In
                the drop phase, this list should contain ONLY THE FIRST tuple.

                This argument is assumed to have been validated before this method
                is called.
            piece (str): the piece ('b' or 'r') to place on the board
        """
        if len(move) > 1:
            self.board[move[1][0]][move[1][1]] = ' '
        self.board[move[0][0]][move[0][1]] = piece

    def print_board(self):
        """ Formatted printing for the board """
        for row in range(len(self.board)):
            line = str(row)+": "
            for cell in self.board[row]:
                line += cell + " "
            print(line)
        print("   A B C D E")

    
    def heuristic_game_value(self, state):
        """ 
        TODO: Define the heuristic game value of the current board state taking into account players
        and opponents

        Args:
        state (list of lists): either the current state of the game as saved in
            this TeekoPlayer object, or a generated successor state.

        Returns:
            float heuristic_val (heuristic computed for the game state)
        """

        game_val = self.game_value(state)
        if game_val != 0:
            return game_val

        my_score = self.check_heur(state, self.my_piece)
        opp_score = self.check_heur(state, self.opp)
        heuristic_val = (my_score - opp_score) / max(my_score + opp_score, 1)
        return max(-0.99, min(0.99, heuristic_val))
    
    def check_heur(self, state, piece):
        opp = 'r' if piece == 'b' else 'b'
        score = 0

        # check rows and columns
        for i in range(5):
            row = state[i]
            if opp not in row:
                score += self.check_vec(row, piece, win=False) * 0.25

        for i in range(5):
            col = [state[j][i] for j in range(5)]
            if opp not in col:
                score += self.check_vec(col, piece, win=False) * 0.25

        # check diagonals
        diags = []
        for j in [0, 4]:
            diags.append([state[i][abs(i-j)] for i in range(4)])
            diags.append([state[i][abs(i-j)] for i in range(1,5)])
            diags.append([state[i+1][abs(j-i)] for i in range(4)])
            if j == 0:
                diags.append([state[i][abs(j-i)+1] for i in range(4)])
            else:
                diags.append([state[i][abs(j-i)-1] for i in range(4)])

        for diag in diags:
            if opp not in diag:
                score += self.check_vec(diag, piece, win=False) * 0.25

        # check 2x2 boxes
        for i in range(4):
            for j in range(4):
                box = [state[i][j], state[i+1][j], state[i][j+1], state[i+1][j+1]]
                if opp not in box:
                    score += box.count(piece) * 0.25

        return score

 
    def game_value(self, state):
        """ 
        TODO: Checks the current board status for a win condition

        Args:
        state (list of lists): either the current state of the game as saved in
            this TeekoPlayer object, or a generated successor state.

        Returns:
            int: 1 if this TeekoPlayer wins, -1 if the opponent wins, 0 if no winner
        """

        if self.check_win(state, self.my_piece):
            return 1
        elif self.check_win(state, self.opp):
            return -1
        
        return 0 # no winner yet

    def check_win(self, state, piece):
        
        # check rows and columns

        for i in range(5):
            row = state[i]
            if self.check_vec(row, piece):
                return True
        
        for i in range(5):
            col = [state[j][i] for j in range(5)]
            if self.check_vec(col, piece):
                return True

        # check diagonals

        diags = []
        for j in [0, 4]:
            diags.append([state[i][abs(i-j)] for i in range(4)])
            diags.append([state[i][abs(i-j)] for i in range(1,5)])

            diags.append([state[i+1][abs(j-i)] for i in range(4)])
            if j == 0:
                diags.append([state[i][abs(j-i)+1] for i in range(4)])
            else:
                diags.append([state[i][abs(j-i)-1] for i in range(4)])

        for diag in diags:
            if self.check_vec(diag, piece):
                return True

        # check 2x2 boxes
        for i in range(4):
            for j in range(4):
                if (state[i][j] == piece and state[i+1][j] == piece and
                        state[i][j+1] == piece and state[i+1][j+1] == piece):
                    return True

        return False

    def check_vec(self, line, piece, win = True):
        if win:
            for i in range(len(line) - 3):
                if all(line[i+k] == piece for k in range(4)):
                    return True
            return False

        return line.count(piece)
    
    
    def max_value(self, state, depth, alpha, beta):
        gv = self.game_value(state)
        if gv != 0:
            return gv
        if depth >= self.max_depth:
            return self.heuristic_game_value(state)
        for succ in self.succ(state, self.my_piece):
            alpha = max(alpha, self.min_value(succ, depth + 1, alpha, beta))
            if alpha >= beta:
                break
        return alpha

    def min_value(self, state, depth, alpha, beta):
        gv = self.game_value(state)
        if gv != 0:
            return gv
        if depth >= self.max_depth:
            return self.heuristic_game_value(state)
        for succ in self.succ(state, self.opp):
            beta = min(beta, self.max_value(succ, depth + 1, alpha, beta))
            if beta <= alpha:
                break
        return beta



############################################################################
#
# THE FOLLOWING CODE IS FOR SAMPLE GAMEPLAY ONLY
#
############################################################################
def main():
    print('Hello, this is Samaritan')
    ai = TeekoPlayer()
    piece_count = 0
    turn = 0

    # drop phase
    while piece_count < 8 and ai.game_value(ai.board) == 0:

        # get the player or AI's move
        if ai.my_piece == ai.pieces[turn]:
            ai.print_board()
            move = ai.make_move(ai.board)
            ai.place_piece(move, ai.my_piece)
            print(ai.my_piece+" moved at "+chr(move[0][1]+ord("A"))+str(move[0][0]))
        else:
            move_made = False
            ai.print_board()
            print(ai.opp+"'s turn")
            while not move_made:
                player_move = input("Move (e.g. B3): ")
                while player_move[0] not in "ABCDE" or player_move[1] not in "01234":
                    player_move = input("Move (e.g. B3): ")
                try:
                    ai.opponent_move([(int(player_move[1]), ord(player_move[0])-ord("A"))])
                    move_made = True
                except Exception as e:
                    print(e)

        # update the game variables
        piece_count += 1
        turn += 1
        turn %= 2

    # move phase - can't have a winner until all 8 pieces are on the board
    while ai.game_value(ai.board) == 0:

        # get the player or AI's move
        if ai.my_piece == ai.pieces[turn]:
            ai.print_board()
            move = ai.make_move(ai.board)
            ai.place_piece(move, ai.my_piece)
            print(ai.my_piece+" moved from "+chr(move[1][1]+ord("A"))+str(move[1][0]))
            print("  to "+chr(move[0][1]+ord("A"))+str(move[0][0]))
        else:
            move_made = False
            ai.print_board()
            print(ai.opp+"'s turn")
            while not move_made:
                move_from = input("Move from (e.g. B3): ")
                while move_from[0] not in "ABCDE" or move_from[1] not in "01234":
                    move_from = input("Move from (e.g. B3): ")
                move_to = input("Move to (e.g. B3): ")
                while move_to[0] not in "ABCDE" or move_to[1] not in "01234":
                    move_to = input("Move to (e.g. B3): ")
                try:
                    ai.opponent_move([(int(move_to[1]), ord(move_to[0])-ord("A")),
                                    (int(move_from[1]), ord(move_from[0])-ord("A"))])
                    move_made = True
                except Exception as e:
                    print(e)

        # update the game variables
        turn += 1
        turn %= 2

    ai.print_board()
    if ai.game_value(ai.board) == 1:
        print("AI wins! Game over.")
    else:
        print("You win! Game over.")


if __name__ == "__main__":
    main()
