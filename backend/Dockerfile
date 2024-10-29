FROM ocaml/opam:debian-12-ocaml-5.3
RUN sudo apt-get update && sudo apt-get install -y libev-dev libgmp-dev pkg-config libssl-dev
WORKDIR /home/opam
COPY --chown=opam:opam . .
RUN rm -rf _build/
RUN opam install . --deps-only --working-dir --yes
RUN rm -rf opam-repository # Strangely enough, this is required and it works
RUN make
CMD ["make", "run"]
EXPOSE 8081
