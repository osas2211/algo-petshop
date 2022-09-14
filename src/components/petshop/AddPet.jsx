import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Button, FloatingLabel, Form, Modal } from "react-bootstrap";

const AddPet = ({ createPet }) => {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");

  const isFormFilled = useCallback(() => {
    return name && image && breed && age && location;
  }, [name, image, breed, age, location]);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button
        onClick={handleShow}
        variant="dark"
        className="rounded-pill px-0"
        style={{ width: "38px" }}
      >
        <i className="bi bi-plus"></i>
      </Button>
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Pet</Modal.Title>
        </Modal.Header>
        <Form>
          <Modal.Body>
            <FloatingLabel
              controlId="inputName"
              label="Pet name"
              className="mb-3"
            >
              <Form.Control
                type="text"
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="Enter name of pet"
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputUrl"
              label="Image URL"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Image URL"
                onChange={(e) => {
                  setImage(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputBreed"
              label="Breed"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="breed"
                onChange={(e) => {
                  setBreed(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel controlId="inputAge" label="Age" className="mb-3">
              <Form.Control
                type="text"
                placeholder="age"
                onChange={(e) => {
                  setAge(e.target.value);
                }}
              />
            </FloatingLabel>
            <FloatingLabel
              controlId="inputLocation"
              label="Location"
              className="mb-3"
            >
              <Form.Control
                type="text"
                placeholder="Location"
                onChange={(e) => {
                  setLocation(e.target.value);
                }}
              />
            </FloatingLabel>
          </Modal.Body>
        </Form>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="dark"
            disabled={!isFormFilled()}
            onClick={async () => {
              try {
                await createPet({
                  name,
                  image,
                  breed,
                  age,
                  location,
                });
                handleClose();
              } catch (error) {
                console.log(error);
              }
            }}
          >
            Add Pet
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};
AddPet.propTypes = {
  createPet: PropTypes.func.isRequired,
};

export default AddPet;
